import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getStorage, connectStorageEmulator, ref, uploadBytes } from 'firebase/storage';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { DEMO_PROJECT, EMULATOR_PORTS } from '../../functions/src/config.js';
import { publicDetails, publicAccount, assertEmulatorRuntime } from '../../functions/src/security.js';

assert.equal(process.env.GCLOUD_PROJECT, DEMO_PROJECT, 'Execute somente por npm run test:backend.');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, `127.0.0.1:${EMULATOR_PORTS.firestore}`);
const tag = randomUUID().slice(0, 8), apps = [], actors = {};
let admin, db;
const secretCPF = '52998224725';
const details = { cpf: secretCPF, cep: '78200000', uf: 'MT', cidade: 'Cáceres', rua: 'Rua de teste', bairro: 'Centro', numero: '10', bio: 'Profissional de teste', categorias: ['Eletricista'] };
const identity = key => `test_${key}_${tag}`;
const call = (actor, name, data = {}) => httpsCallable(actor.functions, name)(data).then(result => result.data);
const execute = (actor, command, requestId = randomUUID()) => call(actor, 'executeCommand', { requestId, command });
const rejectsCode = (promise, code) => assert.rejects(promise, error => error.code === `functions/${code}`);
const newOrder = () => ({ type: 'createOrder', id: randomUUID(), messageId: randomUUID(), worker_id: identity('worker'), servico_id: identity('service'), text: 'Solicitação particular de teste', agendamento: 'A combinar' });

async function actor(key, role = 'CONTRATANTE', status = 'APPROVED', claims = {}, verified = true, createAccount = true) {
  const uid = identity(key), email = `${uid}@example.test`;
  await adminAuth(admin).createUser({ uid, email, password: 'TesteLocal@123', emailVerified: verified });
  await adminAuth(admin).setCustomUserClaims(uid, claims);
  if (createAccount) {
    const account = { id: uid, nome: `Teste ${key}`, role, status, foto_perfil_url: '', data_criacao: new Date().toISOString(), createdAt: Date.now() };
    const profile = { ...details, email, telefone: '65999990000', user_id: uid, portfolio_fotos: [], banner_url: '', isOnline: true };
    await db.doc(`accounts/${uid}`).set(account); await db.doc(`privateProfiles/${uid}`).set(profile);
    if (role === 'TRABALHADOR' && status === 'APPROVED') await db.doc(`publicProfiles/${uid}`).set({ ...publicAccount(account), details: publicDetails(profile) });
  }
  const app = initializeApp({ projectId: DEMO_PROJECT, apiKey: 'emulator-only-api-key', storageBucket: `${DEMO_PROJECT}.appspot.com` }, uid);
  apps.push(app);
  const auth = getAuth(app); connectAuthEmulator(auth, `http://127.0.0.1:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
  const firestore = getFirestore(app); connectFirestoreEmulator(firestore, '127.0.0.1', EMULATOR_PORTS.firestore);
  const functions = getFunctions(app, 'southamerica-east1'); connectFunctionsEmulator(functions, '127.0.0.1', EMULATOR_PORTS.functions);
  const storage = getStorage(app); connectStorageEmulator(storage, '127.0.0.1', EMULATOR_PORTS.storage);
  await signInWithEmailAndPassword(auth, email, 'TesteLocal@123');
  return { uid, email, auth, firestore, functions, storage };
}
before(async () => {
  admin = initializeAdmin({ projectId: DEMO_PROJECT }, `tests_${tag}`); db = adminFirestore(admin);
  actors.client = await actor('client'); actors.worker = await actor('worker', 'TRABALHADOR');
  actors.other = await actor('other'); actors.admin = await actor('admin', 'ADMIN', 'APPROVED', { admin: true });
  actors.fakeAdmin = await actor('fakeAdmin', 'CONTRATANTE', 'APPROVED', { admin: true });
  actors.pending = await actor('pending', 'TRABALHADOR', 'PENDING');
  actors.unverified = await actor('unverified', 'CONTRATANTE', 'APPROVED', {}, false);
  await db.doc(`services/${identity('service')}`).set({ id: identity('service'), worker_id: actors.worker.uid, titulo: 'Reparo', descricao: 'Teste', imagem_url: '', preco_centavos: 10000, published: true });
}, { timeout: 90000 });
after(async () => { await Promise.all(apps.map(app => deleteApp(app))); if (db) await db.terminate(); if (admin) await deleteAdmin(admin); });

test('O backend recusa configuração de nuvem e emuladores de outro projeto', () => {
  const env = { FUNCTIONS_EMULATOR: 'true', GCLOUD_PROJECT: DEMO_PROJECT, FIRESTORE_EMULATOR_HOST: `127.0.0.1:${EMULATOR_PORTS.firestore}`, FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${EMULATOR_PORTS.auth}` };
  assert.doesNotThrow(() => assertEmulatorRuntime(env));
  assert.throws(() => assertEmulatorRuntime({ ...env, GCLOUD_PROJECT: 'outro-projeto' }));
  assert.throws(() => assertEmulatorRuntime({ ...env, FUNCTIONS_EMULATOR: '' }));
  assert.throws(() => assertEmulatorRuntime({ ...env, FIRESTORE_EMULATOR_HOST: '' }));
});
test('Auth rejeita senha incorreta', async () => {
  await assert.rejects(signInWithEmailAndPassword(actors.client.auth, actors.client.email, 'SenhaErrada123'));
  await signInWithEmailAndPassword(actors.client.auth, actors.client.email, 'TesteLocal@123');
});
test('CPF e endereço não aparecem no snapshot público; somente titular lê documento privado', async () => {
  const app = initializeApp({ projectId: DEMO_PROJECT, apiKey: 'emulator-only-api-key' }, `anonymous_${tag}`); apps.push(app);
  const functions = getFunctions(app, 'southamerica-east1'); connectFunctionsEmulator(functions, '127.0.0.1', EMULATOR_PORTS.functions);
  const snapshot = await call({ functions }, 'getSnapshot');
  assert.ok(!JSON.stringify(snapshot).includes(secretCPF));
  assert.equal(snapshot.currentUser, null); assert.deepEqual(snapshot.orders, []);
  await rejectsCode(call({ functions }, 'executeCommand', { requestId: randomUUID(), command: newOrder() }), 'unauthenticated');
  await assertSucceeds(getDoc(doc(actors.client.firestore, 'privateProfiles', actors.client.uid)));
  await assertFails(getDoc(doc(actors.other.firestore, 'privateProfiles', actors.client.uid)));
  await assertFails(getDocs(collection(actors.other.firestore, 'privateProfiles')));
});
test('Toda escrita direta é negada, incluindo promoção a administrador e exclusão', async () => {
  await assertFails(setDoc(doc(actors.client.firestore, 'accounts', actors.client.uid), { role: 'ADMIN' }, { merge: true }));
  await assertFails(deleteDoc(doc(actors.client.firestore, 'accounts', actors.client.uid)));
  await assertFails(setDoc(doc(actors.admin.firestore, 'accounts', actors.client.uid), { role: 'ADMIN' }, { merge: true }));
  await assertFails(setDoc(doc(actors.worker.firestore, 'services', 'arbitrary'), { published: true }));
  await assertFails(setDoc(doc(actors.client.firestore, 'col_users', 'legacy'), { role: 'ADMIN' }));
});
test('Claim administrativa sozinha não concede poder; campos extras não promovem papel', async () => {
  await rejectsCode(execute(actors.fakeAdmin, { type: 'approveWorker', id: actors.pending.uid }), 'permission-denied');
  await rejectsCode(execute(actors.client, { type: 'patch', entity: 'users', changes: [{ id: actors.client.uid, patch: { role: 'ADMIN' } }] }), 'invalid-argument');
  await rejectsCode(execute(actors.client, { type: 'patch', entity: 'users', changes: [{ id: actors.other.uid, patch: { nome: 'Invadido' } }] }), 'permission-denied');
});
test('E-mail não confirmado não solicita serviços; conta pendente também não', async () => {
  await rejectsCode(execute(actors.unverified, newOrder()), 'failed-precondition');
  await rejectsCode(execute(actors.pending, newOrder()), 'permission-denied');
});
test('Pedido é idempotente; outra carga com a mesma chave é recusada', async () => {
  const command = newOrder(), requestId = randomUUID();
  const [a, b] = await Promise.all([execute(actors.client, command, requestId), execute(actors.client, command, requestId)]);
  assert.deepEqual(a, b);
  await rejectsCode(execute(actors.client, { ...command, text: 'Outra carga' }, requestId), 'already-exists');
  const messages = await db.doc(`orders/${command.id}`).collection('messages').get(); assert.equal(messages.size, 1);
  await execute(actors.client, { type: 'changeStatus', orderId: command.id, status: 'CANCELADO' });
});
test('Só participantes leem ou alteram pedido e mensagens, inclusive frente ao administrador', async () => {
  const command = newOrder(); await execute(actors.client, command);
  await assertSucceeds(getDoc(doc(actors.worker.firestore, 'orders', command.id)));
  for (const outsider of [actors.other, actors.admin]) {
    await assertFails(getDoc(doc(outsider.firestore, 'orders', command.id)));
    await assertFails(getDocs(collection(outsider.firestore, 'orders', command.id, 'messages')));
    await rejectsCode(execute(outsider, { type: 'sendMessage', orderId: command.id, message: { id: randomUUID(), text: 'Invasão' } }), 'permission-denied');
    const snapshot = await call(outsider, 'getSnapshot'); assert.ok(!snapshot.orders.some(order => order.id === command.id));
  }
  await execute(actors.client, { type: 'changeStatus', orderId: command.id, status: 'CANCELADO' });
});
test('Mensagens simultâneas são preservadas; identidade e horário fornecidos pelo cliente são recusados', async () => {
  const command = newOrder(); await execute(actors.client, command);
  await rejectsCode(execute(actors.client, { type: 'sendMessage', orderId: command.id, message: { id: randomUUID(), text: 'Texto', sender: actors.worker.uid } }), 'invalid-argument');
  await Promise.all([execute(actors.client, { type: 'sendMessage', orderId: command.id, message: { id: randomUUID(), text: 'Mensagem cliente' } }), execute(actors.worker, { type: 'sendMessage', orderId: command.id, message: { id: randomUUID(), text: 'Mensagem profissional' } })]);
  const messages = await db.doc(`orders/${command.id}`).collection('messages').get(); assert.equal(messages.size, 3);
  assert.ok(messages.docs.some(doc => doc.data().sender === actors.worker.uid));
  await execute(actors.client, { type: 'changeStatus', orderId: command.id, status: 'CANCELADO' });
});
test('Transições, valor em centavos e uma avaliação por autor são impostos pelo servidor', async () => {
  const command = newOrder(); await execute(actors.client, command);
  await rejectsCode(execute(actors.client, { type: 'changeStatus', orderId: command.id, status: 'CONCLUIDO', price: 10 }), 'failed-precondition');
  await execute(actors.worker, { type: 'changeStatus', orderId: command.id, status: 'EM_ANDAMENTO' });
  await execute(actors.worker, { type: 'changeStatus', orderId: command.id, status: 'CONCLUIDO', price: 123.45 });
  assert.equal((await db.doc(`orders/${command.id}`).get()).data().preco_final_centavos, 12345);
  const review = { type: 'review', order_id: command.id, nota: 5, comentario: 'Bom atendimento no teste' };
  await execute(actors.client, review); await rejectsCode(execute(actors.client, review), 'already-exists');
  await rejectsCode(execute(actors.other, review), 'permission-denied');
  const publicReviews = await db.collection('publicReviews').where('worker_id', '==', actors.worker.uid).get();
  assert.ok(publicReviews.docs.every(doc => !doc.data().user_id && !doc.data().order_id && !doc.data().participantIds));
});
test('Só administrador aprovado com claim aprova profissional; retirada do papel revoga o acesso', async () => {
  await execute(actors.admin, { type: 'approveWorker', id: actors.pending.uid });
  const publicProfile = (await db.doc(`publicProfiles/${actors.pending.uid}`).get()).data();
  assert.equal(publicProfile.status, 'APPROVED'); assert.ok(!JSON.stringify(publicProfile).includes(secretCPF));
  await db.doc(`accounts/${actors.admin.uid}`).update({ role: 'CONTRATANTE' });
  await rejectsCode(execute(actors.admin, { type: 'rejectWorker', id: actors.pending.uid }), 'permission-denied');
  await assertFails(getDoc(doc(actors.admin.firestore, 'privateProfiles', actors.client.uid)));
  await db.doc(`accounts/${actors.admin.uid}`).update({ role: 'ADMIN' });
});
test('Chamados são privados; administração autorizada responde e encerra', async () => {
  const ticketId = randomUUID(); await execute(actors.client, { type: 'ticketMessage', ticketId, id: randomUUID(), text: 'Preciso de suporte' });
  await assertFails(getDoc(doc(actors.other.firestore, 'supportTickets', ticketId)));
  await rejectsCode(execute(actors.other, { type: 'ticketMessage', ticketId, id: randomUUID(), text: 'Invasão' }), 'permission-denied');
  await execute(actors.admin, { type: 'ticketMessage', ticketId, id: randomUUID(), text: 'Resposta do suporte' });
  await execute(actors.admin, { type: 'closeTicket', id: ticketId });
  await rejectsCode(execute(actors.client, { type: 'ticketMessage', ticketId, id: randomUUID(), text: 'Após encerramento' }), 'permission-denied');
});
test('Uploads e exclusão remota permanecem fechados; logs não guardam conteúdo pessoal', async () => {
  await assertFails(uploadBytes(ref(actors.client.storage, `users/${actors.client.uid}/avatar.png`), new Uint8Array([1, 2, 3]), { contentType: 'image/png' }));
  await rejectsCode(execute(actors.client, { type: 'deleteAccount', id: actors.client.uid }), 'failed-precondition');
  const logs = await db.collection('auditLogs').where('actor', '==', actors.client.uid).get();
  const serialized = JSON.stringify(logs.docs.map(doc => doc.data()));
  assert.ok(!serialized.includes(secretCPF) && !serialized.includes('Mensagem cliente') && !serialized.includes(actors.client.email));
});
test('Cadastro não recebe senha no payload, rejeita administrador e é retomável com idempotência', async () => {
  const fresh = await actor('signup', 'CONTRATANTE', 'APPROVED', {}, false, false);
  const command = { type: 'register', user: { nome: 'Novo cadastro', telefone: '65999990000', role: 'CONTRATANTE' }, details };
  await rejectsCode(execute(fresh, { ...command, user: { ...command.user, role: 'ADMIN' } }), 'invalid-argument');
  await rejectsCode(execute(fresh, { ...command, user: { ...command.user, senha: 'NaoPode' } }), 'invalid-argument');
  const result = await execute(fresh, command, 'same_registration');
  assert.equal(result.user.id, fresh.uid);
  assert.deepEqual(await execute(fresh, command, 'same_registration'), result);
  assert.ok(!(await db.doc(`accounts/${fresh.uid}`).get()).data().senha);
});
test('Limite de requisições funciona no servidor, compartilhado entre instâncias', async () => {
  const limited = await actor('limited');
  for (const minute of [Math.floor(Date.now() / 60000), Math.floor(Date.now() / 60000) + 1]) {
    const id = createHash('sha256').update(`${limited.uid}:mutation:${minute}`).digest('hex');
    await db.doc(`rateLimits/${id}`).set({ count: 60 });
  }
  await rejectsCode(execute(limited, newOrder()), 'resource-exhausted');
});
test('Links reais do Auth Emulator verificam e-mail e redefinem senha', async () => {
  const fresh = await actor('email', 'CONTRATANTE', 'APPROVED', {}, false);
  await sendEmailVerification(fresh.auth.currentUser);
  await sendPasswordResetEmail(fresh.auth, fresh.email);
  const response = await fetch(`http://127.0.0.1:${EMULATOR_PORTS.auth}/emulator/v1/projects/${DEMO_PROJECT}/oobCodes`);
  const { oobCodes } = await response.json();
  const verification = oobCodes.find(code => code.email === fresh.email && code.requestType === 'VERIFY_EMAIL');
  const reset = oobCodes.find(code => code.email === fresh.email && code.requestType === 'PASSWORD_RESET');
  assert.ok(verification && reset);
  await applyActionCode(fresh.auth, verification.oobCode);
  assert.equal(await verifyPasswordResetCode(fresh.auth, reset.oobCode), fresh.email);
  await confirmPasswordReset(fresh.auth, reset.oobCode, 'NovaSenhaLocal@123');
  await signInWithEmailAndPassword(fresh.auth, fresh.email, 'NovaSenhaLocal@123');
  assert.equal(fresh.auth.currentUser.emailVerified, true);
});
