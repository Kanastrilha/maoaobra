import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, registerAccount, resolveSession, snapshotFor, SESSION_MS } from '../src/data/domain.js';
import { INITIAL_USERS, INITIAL_WORKER_DETAILS, INITIAL_CONTRATANTE_DETAILS, INITIAL_SERVICES } from '../src/data/fixtures.js';
import { isWorkerOnline } from '../src/data/availability.js';
import { createCredential, verifyCredential } from '../src/data/passwords.js';
import { assertLocalConfiguration, assertAppConfiguration } from '../src/firebase.js';

const NOW = Date.parse('2026-11-01T12:00:00-04:00');
function database() {
  return structuredClone({ users: INITIAL_USERS, workerDetails: INITIAL_WORKER_DETAILS, contratanteDetails: INITIAL_CONTRATANTE_DETAILS,
    services: INITIAL_SERVICES, orders: [], reviews: [], supportTickets: [], credentials: { c1: { demo: true }, w1: { demo: true } },
    sessions: { client: { userId: 'c1', lastActivity: NOW }, worker: { userId: 'w1', lastActivity: NOW }, admin: { userId: 'a1', lastActivity: NOW } } });
}
function order(state) { applyCommand(state, 'client', { type: 'createOrder', id: 'order-1', worker_id: 'w1', servico_id: 's1', text: 'Preciso de um reparo', messageId: 'initial', agendamento: 'A combinar' }, NOW); }
function finish(state) {
  order(state); applyCommand(state, 'worker', { type: 'changeStatus', orderId: 'order-1', status: 'EM_ANDAMENTO' }, NOW);
  applyCommand(state, 'worker', { type: 'changeStatus', orderId: 'order-1', status: 'CONCLUIDO', price: 90 }, NOW);
}

test('A cópia rejeita qualquer configuração remota e não possui fallback Firebase', () => {
  assert.doesNotThrow(() => assertLocalConfiguration({ VITE_DATA_MODE: 'local' }));
  assert.throws(() => assertLocalConfiguration({ VITE_DATA_MODE: 'firebase' }));
  assert.throws(() => assertLocalConfiguration({ VITE_FIREBASE_PROJECT_ID: 'maoaobra-51218' }));
});

test('Configuração pública não aceita variáveis VITE_ fora da lista permitida', () => {
  assert.doesNotThrow(() => assertLocalConfiguration({ VITE_DATA_MODE: 'local', MODE: 'test', DEV: true }));
  assert.throws(() => assertLocalConfiguration({ VITE_SECRET: 'test-only-marker' }), /VITE_/);
  assert.throws(() => assertLocalConfiguration({ VITE_FIREBASE_PROJECT_ID: '' }), /VITE_/);
  assert.throws(() => assertLocalConfiguration({ VITE_PRIVATE_KEY: 'test-only-marker' }),
    error => error.message.includes('VITE_') && !error.message.includes('test-only-marker'));
});

test('Modos de demonstração continuam isolados e nuvem exige configuração completa', () => {
  assert.doesNotThrow(() => assertAppConfiguration({ VITE_DATA_MODE: 'firebase-emulator' }));
  assert.throws(() => assertAppConfiguration({ VITE_DATA_MODE: 'firebase-emulator', VITE_FIREBASE_PROJECT_ID: 'outro-projeto' }));
  assert.throws(() => assertAppConfiguration({ VITE_DATA_MODE: 'firebase-staging' }));
  assert.throws(() => assertAppConfiguration({ VITE_DATA_MODE: 'firebase-emulator', VITE_SECRET: 'example' }));
});
test('Sessões inexistentes ou expiradas não autenticam', () => {
  const state = database();
  assert.equal(resolveSession(state, 'invented', NOW), null);
  assert.equal(resolveSession(state, 'client', NOW + SESSION_MS), null);
  assert.throws(() => applyCommand(state, 'invented', { type: 'approveWorker', id: 'w1' }, NOW));
});
test('Papéis não podem ser promovidos pela edição de perfil', () => {
  const state = database();
  assert.throws(() => applyCommand(state, 'client', { type: 'patch', entity: 'users', changes: [{ id: 'c1', patch: { role: 'ADMIN' } }] }, NOW));
  assert.equal(state.users.find(u => u.id === 'c1').role, 'CONTRATANTE');
});
test('Clientes não aprovam profissionais nem editam outro usuário', () => {
  const state = database();
  assert.throws(() => applyCommand(state, 'client', { type: 'approveWorker', id: 'w1' }, NOW));
  assert.throws(() => applyCommand(state, 'client', { type: 'patch', entity: 'users', changes: [{ id: 'w1', patch: { nome: 'Outro nome' } }] }, NOW));
});
test('Snapshots públicos não expõem credenciais, CPF, endereço ou clientes', () => {
  const snapshot = snapshotFor(database(), '', NOW);
  assert.ok(!('credentials' in snapshot) && !('sessions' in snapshot));
  assert.equal(snapshot.contratanteDetails.length, 0);
  assert.ok(snapshot.users.every(u => u.role === 'TRABALHADOR' && !u.email));
  assert.ok(snapshot.workerDetails.every(d => !d.cpf && !d.rua && !d.lat));
});
test('Cadastros novos preservam outros usuários e nunca gravam senhas no perfil', () => {
  const state = database();
  state.users.push({ id: 'parallel-user', email: 'parallel@example.test' });
  const user = registerAccount(state, { nome: 'Teste local', email: 'test@example.test', senha: 'not-stored', role: 'CONTRATANTE' }, { cpf: '529.982.247-25' }, { salt: 'example' }, 'new-user', NOW);
  assert.ok(state.users.some(u => u.id === 'parallel-user'));
  assert.ok(!('senha' in user) && !('passwordHash' in user));
  assert.equal(state.credentials['new-user'].salt, 'example');
  assert.throws(() => registerAccount(state, { nome: 'Teste', email: 'test@example.test', role: 'CONTRATANTE' }, { cpf: '529.982.247-25' }, {}, 'duplicate', NOW));
});
test('O cadastro não aceita o perfil administrador', () => {
  assert.throws(() => registerAccount(database(), { nome: 'Teste', email: 'test@example.test', role: 'ADMIN' }, { cpf: '529.982.247-25' }, {}, 'id', NOW));
});
test('Pedidos podem ser enviados fora do expediente', () => {
  const state = database(); order(state);
  assert.equal(state.orders.length, 1);
  assert.equal(state.orders[0].status, 'PENDENTE');
});
test('O cliente não pode escolher um serviço de outro profissional', () => {
  const state = database();
  assert.throws(() => applyCommand(state, 'client', { type: 'createOrder', id: 'o', worker_id: 'w1', servico_id: 's3' }, NOW));
});
test('Mensagens acrescentadas ao estado mais recente preservam ambos os envios', () => {
  const state = database(); order(state);
  applyCommand(state, 'client', { type: 'sendMessage', orderId: 'order-1', message: { id: 'A', text: 'Mensagem A' } }, NOW);
  applyCommand(state, 'worker', { type: 'sendMessage', orderId: 'order-1', message: { id: 'B', text: 'Mensagem B' } }, NOW);
  assert.deepEqual(state.orders[0].chat_history.map(m => m.id), ['initial', 'A', 'B']);
  applyCommand(state, 'worker', { type: 'sendMessage', orderId: 'order-1', message: { id: 'B', text: 'Mensagem B' } }, NOW);
  assert.equal(state.orders[0].chat_history.length, 3);
});
test('Terceiros não podem enviar mensagens em outro atendimento', () => {
  const state = database(); order(state);
  state.sessions.other = { userId: 'w2', lastActivity: NOW };
  assert.throws(() => applyCommand(state, 'other', { type: 'sendMessage', orderId: 'order-1', message: { id: 'x', text: 'Intruso' } }, NOW));
});
test('O cliente não pode concluir unilateralmente o serviço', () => {
  const state = database(); order(state);
  assert.throws(() => applyCommand(state, 'client', { type: 'changeStatus', orderId: 'order-1', status: 'CONCLUIDO', price: 90 }, NOW));
});
test('Avaliações exigem serviço concluído e são únicas por pedido e autor', () => {
  const state = database(); order(state);
  assert.throws(() => applyCommand(state, 'client', { type: 'review', order_id: 'order-1', nota: 5, comentario: 'Excelente' }, NOW));
  applyCommand(state, 'worker', { type: 'changeStatus', orderId: 'order-1', status: 'EM_ANDAMENTO' }, NOW);
  applyCommand(state, 'worker', { type: 'changeStatus', orderId: 'order-1', status: 'CONCLUIDO', price: 100 }, NOW);
  applyCommand(state, 'client', { type: 'review', order_id: 'order-1', nota: 5, comentario: 'Excelente' }, NOW);
  assert.throws(() => applyCommand(state, 'client', { type: 'review', order_id: 'order-1', nota: 5, comentario: 'Excelente' }, NOW));
  assert.equal(state.reviews.length, 1);
});
test('Excluir uma conta remove credenciais, sessões e todos os dados relacionados', () => {
  const state = database(); finish(state);
  applyCommand(state, 'client', { type: 'review', order_id: 'order-1', nota: 5, comentario: 'Excelente' }, NOW);
  applyCommand(state, 'client', { type: 'ticketMessage', ticketId: 't', id: 'm', text: 'Ajuda local' }, NOW);
  applyCommand(state, 'client', { type: 'deleteAccount', id: 'c1' }, NOW);
  assert.ok(!state.users.some(u => u.id === 'c1'));
  assert.equal(state.contratanteDetails.length, 0);
  assert.equal(state.orders.length, 0);
  assert.equal(state.reviews.length, 0);
  assert.equal(state.supportTickets.length, 0);
  assert.equal(state.credentials.c1, undefined);
  assert.equal(state.sessions.client, undefined);
});
test('Cada senha usa um salt próprio; senha incorreta é rejeitada', async () => {
  const a = await createCredential('example-password'), b = await createCredential('example-password');
  assert.notEqual(a.salt, b.salt); assert.notEqual(a.hash, b.hash);
  assert.equal(await verifyCredential('example-password', a), true);
  assert.equal(await verifyCredential('wrong', a), false);
});
test('Os dias de trabalho e o fuso de Cuiabá são respeitados', () => {
  const worker = { isOnline: true, workingHours: 'Seg-Sex, 08:00 às 18:00' };
  assert.equal(isWorkerOnline(worker, new Date('2026-11-01T12:00:00-04:00')), false);
  assert.equal(isWorkerOnline(worker, new Date('2026-11-02T08:00:00-04:00')), true);
  assert.equal(isWorkerOnline(worker, new Date('2026-11-02T18:00:00-04:00')), false);
});
test('O horário legado 07h–17h é interpretado corretamente', () => {
  assert.equal(isWorkerOnline({ isOnline: true, workingHours: 'Seg-Sab, 07:00 às 17:00' }, new Date('2026-11-02T07:30:00-04:00')), true);
});
test('Expedientes que cruzam a meia-noite pertencem ao dia em que começaram', () => {
  const worker = { isOnline: true, diasTrabalho: 'Seg-Sex', horaInicio: '22:00', horaFim: '06:00' };
  assert.equal(isWorkerOnline(worker, new Date('2026-11-07T01:00:00-04:00')), true);
  assert.equal(isWorkerOnline(worker, new Date('2026-11-08T01:00:00-04:00')), false);
});
