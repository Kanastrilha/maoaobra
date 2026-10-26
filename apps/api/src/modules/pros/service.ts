import type {
  Category,
  MyProProfile,
  PendingPro,
  ProPublicProfile,
  ProSearchResult,
  proApplicationInput,
  proReviewInput,
  proSearchQuery,
} from '@maoaobra/shared';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '../../db';
import { categories, proCategories, proProfiles, users } from '../../db/schema';
import { HttpError } from '../../lib/http';
import type { SessionUser } from '../../lib/session';

async function categoriesByPro(userIds: string[]) {
  const map = new Map<string, Category[]>();
  if (userIds.length === 0) return map;
  const rows = await db
    .select({ userId: proCategories.userId, slug: categories.slug, name: categories.name })
    .from(proCategories)
    .innerJoin(categories, eq(categories.slug, proCategories.categorySlug))
    .where(inArray(proCategories.userId, userIds))
    .orderBy(asc(categories.name));
  for (const { userId, slug, name } of rows) {
    map.set(userId, [...(map.get(userId) ?? []), { slug, name }]);
  }
  return map;
}

export async function applyAsPro(user: SessionUser, input: z.output<typeof proApplicationInput>) {
  if (user.role === 'admin')
    throw new HttpError(409, 'Administradores não se cadastram como profissional');

  const slugs = [...new Set(input.categories)];
  const known = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(and(inArray(categories.slug, slugs), eq(categories.active, true)));
  if (known.length !== slugs.length) throw new HttpError(400, 'Categoria inválida');

  const [existing] = await db
    .select({ status: proProfiles.status })
    .from(proProfiles)
    .where(eq(proProfiles.userId, user.id));
  // Recusado pode reenviar; pendente/aprovado/suspenso não
  if (existing && existing.status !== 'rejected') throw new HttpError(409, 'Cadastro já enviado');

  const [cpfOwner] = await db
    .select({ userId: proProfiles.userId })
    .from(proProfiles)
    .where(and(eq(proProfiles.cpf, input.cpf), ne(proProfiles.userId, user.id)));
  if (cpfOwner) throw new HttpError(409, 'Este CPF já está cadastrado');

  const profile = {
    bio: input.bio,
    cpf: input.cpf,
    serviceRadiusKm: input.serviceRadiusKm,
    location: { x: input.location.lng, y: input.location.lat },
    status: 'pending' as const,
    reviewedAt: null,
  };

  await db.transaction(async (tx) => {
    await tx
      .insert(proProfiles)
      .values({ userId: user.id, ...profile })
      .onConflictDoUpdate({ target: proProfiles.userId, set: profile });
    await tx.delete(proCategories).where(eq(proCategories.userId, user.id));
    await tx
      .insert(proCategories)
      .values(slugs.map((categorySlug) => ({ userId: user.id, categorySlug })));
    await tx.update(users).set({ role: 'pro' }).where(eq(users.id, user.id));
  });
}

export async function getMyProfile(userId: string): Promise<MyProProfile> {
  const [profile] = await db
    .select({
      status: proProfiles.status,
      bio: proProfiles.bio,
      serviceRadiusKm: proProfiles.serviceRadiusKm,
    })
    .from(proProfiles)
    .where(eq(proProfiles.userId, userId));
  if (!profile) throw new HttpError(404, 'Cadastro de profissional não encontrado');
  return { ...profile, categories: (await categoriesByPro([userId])).get(userId) ?? [] };
}

export async function searchPros(
  query: z.output<typeof proSearchQuery>,
): Promise<ProSearchResult[]> {
  const origin = sql`ST_SetSRID(ST_MakePoint(${query.lng}::float8, ${query.lat}::float8), 4326)::geography`;
  const distance = sql<number>`ST_Distance(${proProfiles.location}::geography, ${origin})`;

  const rows = await db
    .select({ id: users.id, name: users.name, bio: proProfiles.bio, distance })
    .from(proProfiles)
    .innerJoin(users, eq(users.id, proProfiles.userId))
    .innerJoin(
      proCategories,
      and(
        eq(proCategories.userId, proProfiles.userId),
        eq(proCategories.categorySlug, query.category),
      ),
    )
    .where(
      and(
        eq(proProfiles.status, 'approved'),
        // Cada profissional define até onde atende: o cliente precisa estar dentro do raio dele
        sql`ST_DWithin(${proProfiles.location}::geography, ${origin}, ${proProfiles.serviceRadiusKm} * 1000)`,
      ),
    )
    .orderBy(distance)
    .limit(50);

  return rows.map(({ distance: meters, ...pro }) => ({
    ...pro,
    distanceKm: Math.round(meters / 100) / 10,
  }));
}

export async function getPublicProfile(id: string): Promise<ProPublicProfile> {
  const [pro] = await db
    .select({ id: users.id, name: users.name, bio: proProfiles.bio })
    .from(proProfiles)
    .innerJoin(users, eq(users.id, proProfiles.userId))
    .where(and(eq(proProfiles.userId, id), eq(proProfiles.status, 'approved')));
  if (!pro) throw new HttpError(404, 'Profissional não encontrado');
  return { ...pro, categories: (await categoriesByPro([id])).get(id) ?? [] };
}

export async function listPendingPros(): Promise<PendingPro[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      phoneNumber: users.phoneNumber,
      bio: proProfiles.bio,
      cpf: proProfiles.cpf,
      createdAt: proProfiles.createdAt,
    })
    .from(proProfiles)
    .innerJoin(users, eq(users.id, proProfiles.userId))
    .where(eq(proProfiles.status, 'pending'))
    .orderBy(asc(proProfiles.createdAt));
  const cats = await categoriesByPro(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    categories: cats.get(row.id) ?? [],
  }));
}

export async function reviewPro(proId: string, { decision }: z.output<typeof proReviewInput>) {
  const updated = await db
    .update(proProfiles)
    .set({ status: decision, reviewedAt: new Date() })
    .where(and(eq(proProfiles.userId, proId), eq(proProfiles.status, 'pending')))
    .returning({ userId: proProfiles.userId });
  if (updated.length === 0) throw new HttpError(404, 'Cadastro pendente não encontrado');
}
