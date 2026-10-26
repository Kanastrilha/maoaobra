import { ORDER_STATUSES, PERIODS, PRO_STATUSES } from '@maoaobra/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  geometry,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth-schema';

export * from './auth-schema';

const tz = (name: string) => timestamp(name, { withTimezone: true });
// x = longitude, y = latitude. O Drizzle grava com SRID 0, que o cast ::geography trata como WGS84 (GPS).
const point = (name: string) => geometry(name, { type: 'point', mode: 'xy' });
// Distância em metros exige geography; o índice é sobre a mesma expressão usada nas consultas
const geoIndex = (name: string, column: Parameters<typeof sql>[1]) =>
  index(name).using('gist', sql`(${column}::geography)`);

export const proStatusEnum = pgEnum('pro_status', PRO_STATUSES);
export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES);
export const periodEnum = pgEnum('period', PERIODS);

export const categories = pgTable('categories', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  active: boolean('active').default(true).notNull(),
});

export const proProfiles = pgTable(
  'pro_profiles',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    bio: text('bio').notNull(),
    cpf: text('cpf').notNull().unique(),
    status: proStatusEnum('status').default('pending').notNull(),
    serviceRadiusKm: integer('service_radius_km').notNull(),
    location: point('location').notNull(),
    reviewedAt: tz('reviewed_at'),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [geoIndex('pro_profiles_location_idx', t.location)],
);

export const proCategories = pgTable(
  'pro_categories',
  {
    userId: text('user_id')
      .notNull()
      .references(() => proProfiles.userId, { onDelete: 'cascade' }),
    categorySlug: text('category_slug')
      .notNull()
      .references(() => categories.slug),
  },
  (t) => [primaryKey({ columns: [t.userId, t.categorySlug] })],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: text('customer_id')
      .notNull()
      .references(() => users.id),
    proId: text('pro_id')
      .notNull()
      .references(() => users.id),
    categorySlug: text('category_slug')
      .notNull()
      .references(() => categories.slug),
    status: orderStatusEnum('status').default('requested').notNull(),
    description: text('description').notNull(),
    scheduledDate: date('scheduled_date', { mode: 'string' }).notNull(),
    period: periodEnum('period').notNull(),
    address: text('address').notNull(),
    neighborhood: text('neighborhood').notNull(),
    location: point('location').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index('orders_customer_idx').on(t.customerId), index('orders_pro_idx').on(t.proId)],
);

// Auditoria: toda mudança de status fica registrada (from null = criação)
export const orderEvents = pgTable(
  'order_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    fromStatus: orderStatusEnum('from_status'),
    toStatus: orderStatusEnum('to_status').notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => users.id),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    mentionsContact: boolean('mentions_contact').default(false).notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [index('messages_order_created_idx').on(t.orderId, t.createdAt)],
);
