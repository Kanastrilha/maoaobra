import { type ChatMessage, isChatOpen, isContactVisible, mentionsContact } from '@maoaobra/shared';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { messages, orders } from '../../db/schema';
import { HttpError } from '../../lib/http';
import type { SessionUser } from '../../lib/session';
import { loadOrderFor } from '../orders/service';

const toMessage = (row: typeof messages.$inferSelect): ChatMessage => ({
  id: row.id,
  senderId: row.senderId,
  body: row.body,
  mentionsContact: row.mentionsContact,
  createdAt: row.createdAt.toISOString(),
});

// ponytail: devolve a conversa inteira; paginar se pedidos passarem a ter centenas de mensagens
export async function listMessages(user: SessionUser, orderId: string) {
  await loadOrderFor(user, orderId);
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.orderId, orderId))
    .orderBy(asc(messages.createdAt));
  return rows.map(toMessage);
}

export async function sendMessage(user: SessionUser, orderId: string, body: string) {
  const { order } = await loadOrderFor(user, orderId);
  if (!isChatOpen(order.status)) throw new HttpError(409, 'Este pedido está encerrado');

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(messages)
      .values({
        orderId,
        senderId: user.id,
        body,
        // Antes da confirmação, marca tentativa de passar contato para o app exibir o aviso
        mentionsContact: !isContactVisible(order.status) && mentionsContact(body),
      })
      .returning();
    if (!row) throw new Error('Falha ao enviar mensagem');
    // Mantém a lista de pedidos ordenada pela conversa mais recente
    await tx.update(orders).set({ updatedAt: new Date() }).where(eq(orders.id, orderId));
    return toMessage(row);
  });
}
