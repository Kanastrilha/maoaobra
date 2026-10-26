import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { TEST_DATABASE_URL } from './database-url';

// Banco de teste recriado do zero a cada execução: os testes também validam as migrations
export default async function setup() {
  const sql = postgres(TEST_DATABASE_URL, { onnotice: () => {} });
  await sql`drop schema if exists drizzle cascade`;
  await sql`drop schema if exists public cascade`;
  await sql`create schema public`;
  await migrate(drizzle({ client: sql }), { migrationsFolder: 'drizzle' });
  await sql.end();
}
