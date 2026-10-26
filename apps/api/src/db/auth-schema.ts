// Tabelas do Better Auth: geradas com `pnpm dlx auth generate --config src/auth.ts --output src/db/auth-schema.ts` e ajustadas à mão
// (timestamptz e enum de papel). Ao regerar, reaplique esses dois ajustes.
import { ROLES } from '@maoaobra/shared';
import { relations } from 'drizzle-orm';
import { boolean, index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

const tz = (name: string) => timestamp(name, { withTimezone: true });

export const roleEnum = pgEnum('role', ROLES);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: tz('created_at').defaultNow().notNull(),
  updatedAt: tz('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  phoneNumber: text('phone_number').unique(),
  phoneNumberVerified: boolean('phone_number_verified'),
  role: roleEnum('role').default('customer').notNull(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: tz('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [index('sessions_userId_idx').on(table.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: tz('access_token_expires_at'),
    refreshTokenExpiresAt: tz('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('accounts_userId_idx').on(table.userId)],
);

export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: tz('expires_at').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
    updatedAt: tz('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
