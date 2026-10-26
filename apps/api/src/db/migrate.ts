import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql } from './index';

await migrate(db, { migrationsFolder: 'drizzle' });
await sql.end();
console.info('Migrations aplicadas.');
