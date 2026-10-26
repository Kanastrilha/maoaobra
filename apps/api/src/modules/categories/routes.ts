import type { Category } from '@maoaobra/shared';
import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { categories } from '../../db/schema';

export async function categoryRoutes(app: FastifyInstance) {
  app.get(
    '/categories',
    async (): Promise<Category[]> =>
      db
        .select({ slug: categories.slug, name: categories.name })
        .from(categories)
        .where(eq(categories.active, true))
        .orderBy(asc(categories.name)),
  );
}
