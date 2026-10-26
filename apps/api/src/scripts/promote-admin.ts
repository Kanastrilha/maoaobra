// Uso: pnpm --filter @maoaobra/api admin:promote "(65) 99999-0000"
// A pessoa precisa ter feito login no app ao menos uma vez.
import { brMobilePhone } from '@maoaobra/shared';
import { eq } from 'drizzle-orm';
import { db, sql } from '../db';
import { users } from '../db/schema';

const phoneNumber = brMobilePhone.parse(process.argv[2] ?? '');
const updated = await db
  .update(users)
  .set({ role: 'admin' })
  .where(eq(users.phoneNumber, phoneNumber))
  .returning({ id: users.id });
await sql.end();

if (updated.length === 0) {
  console.error(`Nenhum usuário com o celular ${phoneNumber}. Faça login no app primeiro.`);
  process.exit(1);
}
console.info(`${phoneNumber} agora é admin.`);
