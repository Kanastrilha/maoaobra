import {
  canTransition,
  isContactVisible,
  nextStatuses,
  type OrderActor,
  type OrderDetail,
  type OrderStatus,
  type OrderSummary,
  type orderCreateInput,
} from '@maoaobra/shared';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { z } from 'zod';
import { db } from '../../db';
import {
  categories,
  orderEvents,
  orders,
  proCategories,
  proProfiles,
  users,
} from '../../db/schema';
import { HttpError, todayInCaceres } from '../../lib/http';
import type { SessionUser } from '../../lib/session';

const counterpart = alias(users, 'counterpart');

/** Pedido + quem é o usuário nele. Quem não participa recebe 404 (não revela que o pedido existe). */
export async function loadOrderFor(user: SessionUser, orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new HttpError(404, 'Pedido não encontrado');
  const actor: OrderActor | null =
    order.customerId === user.id ? 'customer' : order.proId === user.id ? 'pro' : null;
  if (!actor) throw new HttpError(404, 'Pedido não encontrado');
  return { order, actor };
}

/** Transições permitidas agora, incluindo regras que dependem de data. */
function availableTransitions(status: OrderStatus, actor: OrderActor, scheduledDate: string) {
  return nextStatuses(status, actor).filter(
    // "Não compareceu" só faz sentido a partir do dia combinado
    (to) => to !== 'no_show' || scheduledDate <= todayInCaceres(),
  );
}

export async function createOrder(user: SessionUser, input: z.output<typeof orderCreateInput>) {
  if (user.role !== 'customer')
    throw new HttpError(403, 'Apenas clientes podem solicitar serviços');
  if (input.proId === user.id) throw new HttpError(400, 'Você não pode contratar a si mesmo');

  const [offer] = await db
    .select({ userId: proProfiles.userId })
    .from(proProfiles)
    .innerJoin(
      proCategories,
      and(
        eq(proCategories.userId, proProfiles.userId),
        eq(proCategories.categorySlug, input.category),
      ),
    )
    .where(and(eq(proProfiles.userId, input.proId), eq(proProfiles.status, 'approved')));
  if (!offer) throw new HttpError(404, 'Profissional não atende esta categoria');

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        customerId: user.id,
        proId: input.proId,
        categorySlug: input.category,
        description: input.description,
        scheduledDate: input.scheduledDate,
        period: input.period,
        address: input.address,
        neighborhood: input.neighborhood,
        location: { x: input.location.lng, y: input.location.lat },
      })
      .returning({ id: orders.id });
    if (!order) throw new Error('Falha ao criar pedido');
    await tx
      .insert(orderEvents)
      .values({ orderId: order.id, toStatus: 'requested', actorId: user.id });
    return order;
  });
}

const summaryColumns = {
  id: orders.id,
  status: orders.status,
  categorySlug: categories.slug,
  categoryName: categories.name,
  scheduledDate: orders.scheduledDate,
  period: orders.period,
  counterpartName: counterpart.name,
  updatedAt: orders.updatedAt,
};

const counterpartJoin = (userId: string) =>
  sql`${counterpart.id} = case when ${orders.customerId} = ${userId} then ${orders.proId} else ${orders.customerId} end`;

const toSummary = (row: {
  id: string;
  status: OrderStatus;
  categorySlug: string;
  categoryName: string;
  scheduledDate: string;
  period: OrderSummary['period'];
  counterpartName: string;
  updatedAt: Date;
}): OrderSummary => ({
  id: row.id,
  status: row.status,
  category: { slug: row.categorySlug, name: row.categoryName },
  scheduledDate: row.scheduledDate,
  period: row.period,
  counterpartName: row.counterpartName,
  updatedAt: row.updatedAt.toISOString(),
});

export async function listMyOrders(user: SessionUser): Promise<OrderSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(orders)
    .innerJoin(categories, eq(categories.slug, orders.categorySlug))
    .innerJoin(counterpart, counterpartJoin(user.id))
    .where(or(eq(orders.customerId, user.id), eq(orders.proId, user.id)))
    .orderBy(desc(orders.updatedAt))
    .limit(100);
  return rows.map(toSummary);
}

export async function getOrder(user: SessionUser, orderId: string): Promise<OrderDetail> {
  const { actor } = await loadOrderFor(user, orderId);
  const [row] = await db
    .select({
      ...summaryColumns,
      description: orders.description,
      neighborhood: orders.neighborhood,
      address: orders.address,
      counterpartPhone: counterpart.phoneNumber,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(categories, eq(categories.slug, orders.categorySlug))
    .innerJoin(counterpart, counterpartJoin(user.id))
    .where(eq(orders.id, orderId));
  if (!row) throw new HttpError(404, 'Pedido não encontrado');

  return {
    ...toSummary(row),
    role: actor,
    description: row.description,
    neighborhood: row.neighborhood,
    nextStatuses: availableTransitions(row.status, actor, row.scheduledDate),
    contact: isContactVisible(row.status)
      ? { phoneNumber: row.counterpartPhone, address: row.address }
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function transitionOrder(user: SessionUser, orderId: string, to: OrderStatus) {
  const { order, actor } = await loadOrderFor(user, orderId);
  const allowed =
    canTransition(order.status, to, actor) &&
    availableTransitions(order.status, actor, order.scheduledDate).includes(to);
  if (!allowed) throw new HttpError(409, 'Esta ação não está disponível agora');

  // ponytail: fase 2 — 'confirmed' passa a exigir a taxa de serviço paga
  await db.transaction(async (tx) => {
    // Só atualiza se o status ainda é o que lemos: duas ações simultâneas não se atropelam
    const updated = await tx
      .update(orders)
      .set({ status: to })
      .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
      .returning({ id: orders.id });
    if (updated.length === 0)
      throw new HttpError(409, 'O pedido mudou enquanto você agia. Atualize a tela.');
    await tx
      .insert(orderEvents)
      .values({ orderId, fromStatus: order.status, toStatus: to, actorId: user.id });
  });
}
