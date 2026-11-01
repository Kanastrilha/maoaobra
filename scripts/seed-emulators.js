import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { INITIAL_USERS, INITIAL_WORKER_DETAILS, INITIAL_CONTRATANTE_DETAILS, INITIAL_SERVICES } from '../src/data/fixtures.js';
import { publicAccount, publicDetails } from '../functions/src/security.js';
import { EMULATOR_PORTS } from '../functions/src/config.js';

for (const [key, value] of Object.entries({ FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${EMULATOR_PORTS.auth}`, FIRESTORE_EMULATOR_HOST: `127.0.0.1:${EMULATOR_PORTS.firestore}` })) {
  if (process.env[key] && process.env[key] !== value) throw new Error('O seed só pode usar os emuladores locais desta cópia.');
  process.env[key] = value;
}
const app = initializeApp({ projectId: 'demo-maoaobra-copia' });
const auth = getAuth(app), db = getFirestore(app);
for (const user of INITIAL_USERS) {
  let created = false;
  try { await auth.createUser({ uid: user.id, email: user.email, password: 'TesteLocal@123', emailVerified: true }); created = true; }
  catch (error) { if (error.code !== 'auth/uid-already-exists' && error.code !== 'auth/email-already-exists') throw error; }
  if (created && user.role === 'ADMIN') await auth.setCustomUserClaims(user.id, { admin: true });
  const accountRef = db.doc(`accounts/${user.id}`);
  await db.runTransaction(async tx => {
    if ((await tx.get(accountRef)).exists) return;
    const { email, telefone, ...account } = user;
    const details = (user.role === 'TRABALHADOR' ? INITIAL_WORKER_DETAILS : INITIAL_CONTRATANTE_DETAILS).find(row => row.user_id === user.id) || { user_id: user.id };
    const profile = { ...details, email, telefone, horaInicio: '08:00', horaFim: '18:00', diasTrabalho: 'Seg-Sex', timeZone: 'America/Cuiaba' };
    tx.create(accountRef, { ...account, createdAt: Date.now() }); tx.create(db.doc(`privateProfiles/${user.id}`), profile);
    if (user.role === 'TRABALHADOR') tx.create(db.doc(`publicProfiles/${user.id}`), { ...publicAccount(account), details: publicDetails(profile) });
  });
}
for (const { preco_base, ...service } of INITIAL_SERVICES) {
  const document = db.doc(`services/${service.id}`);
  await db.runTransaction(async tx => { if (!(await tx.get(document)).exists) tx.create(document, { ...service, imagem_url: '', preco_centavos: Math.round(preco_base * 100), published: true, updatedAt: Date.now() }); });
}
await db.doc('meta/public').set({ revision: crypto.randomUUID(), updatedAt: Date.now() });
console.log('Contas fictícias preparadas somente em demo-maoaobra-copia. Senha: TesteLocal@123.');
await db.terminate();
