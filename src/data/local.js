import { DATABASE_NAME, assertLocalConfiguration } from '../firebase.js';
import { INITIAL_USERS, INITIAL_WORKER_DETAILS, INITIAL_CONTRATANTE_DETAILS, INITIAL_SERVICES } from './fixtures.js';
import { applyCommand, makeId, registerAccount, resolveSession, snapshotFor } from './domain.js';
import { createCredential, verifyCredential } from './passwords.js';

const SESSION_KEY = 'maoaobra-copy-session-v1';
let databasePromise;
const listeners = new Set();
let channel;
const token = () => sessionStorage.getItem(SESSION_KEY) || '';

function initialDatabase() {
  return {
    users: structuredClone(INITIAL_USERS), workerDetails: structuredClone(INITIAL_WORKER_DETAILS),
    contratanteDetails: structuredClone(INITIAL_CONTRATANTE_DETAILS), services: structuredClone(INITIAL_SERVICES),
    orders: [], reviews: [], supportTickets: [],
    credentials: Object.fromEntries(INITIAL_USERS.map(u => [u.id, { demo: true }])), sessions: {},
  };
}

async function openDatabase() {
  assertLocalConfiguration();
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspace');
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); databasePromise = undefined; };
      resolve(request.result);
    };
    request.onerror = () => { databasePromise = undefined; reject(request.error); };
    request.onblocked = () => reject(new Error('Feche outras abas desta cópia e tente novamente.'));
  });
  return databasePromise;
}

async function transaction(edit) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workspace', edit ? 'readwrite' : 'readonly');
    const store = tx.objectStore('workspace');
    const request = store.get('data');
    let result, failure;
    request.onsuccess = () => {
      try {
        const state = request.result || initialDatabase();
        result = edit ? edit(state) : state;
        if (edit) store.put(state, 'data');
      } catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(failure || tx.error || new Error('Não foi possível salvar os dados locais.'));
    tx.onabort = () => reject(failure || tx.error || new Error('A gravação foi cancelada.'));
  });
}

function announce(broadcast = true) {
  listeners.forEach(listener => listener());
  if (broadcast) channel?.postMessage('changed');
}

export async function initializeLocalDatabase() {
  // Uma única transação inicializa a base, sem repor coleções apagadas.
  await transaction(() => undefined);
}

export function subscribeLocal(onData, onError) {
  let active = true, generation = 0;
  const refresh = async () => {
    const current = ++generation;
    try {
      const state = await transaction();
      if (active && current === generation) onData(snapshotFor(state, token()));
    } catch (error) { if (active) onError(error); }
  };
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(DATABASE_NAME);
    channel.onmessage = () => announce(false);
  }
  listeners.add(refresh);
  void refresh();
  return () => { active = false; generation++; listeners.delete(refresh); };
}

export async function loginLocal(email, password) {
  const state = await transaction();
  const user = state.users.find(u => u.email.toLowerCase() === String(email || '').trim().toLowerCase());
  const credential = user && state.credentials[user.id];
  const valid = credential?.demo ? password === '123' : await verifyCredential(password, credential);
  if (!user || !valid) throw new Error('E-mail ou senha incorretos.');
  if (user.status !== 'APPROVED') throw new Error('Seu cadastro profissional está em análise. Aguarde a aprovação.');
  const sessionToken = makeId();
  await transaction(latest => {
    if (!latest.users.some(u => u.id === user.id && u.status === 'APPROVED') || JSON.stringify(latest.credentials[user.id]) !== JSON.stringify(credential)) throw new Error('Cadastro alterado. Tente entrar novamente.');
    latest.sessions[sessionToken] = { userId: user.id, lastActivity: Date.now() };
  });
  sessionStorage.setItem(SESSION_KEY, sessionToken);
  announce();
  return user;
}

export async function registerLocal(userData, details) {
  if (typeof userData.senha !== 'string' || userData.senha.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
  const credential = await createCredential(userData.senha);
  const id = makeId(), sessionToken = makeId();
  const user = await transaction(state => {
    const created = registerAccount(state, userData, details, credential, id);
    if (created.status === 'APPROVED') state.sessions[sessionToken] = { userId: id, lastActivity: Date.now() };
    return created;
  });
  if (user.status === 'APPROVED') sessionStorage.setItem(SESSION_KEY, sessionToken);
  announce();
  return user;
}

export async function logoutLocal() {
  const oldToken = token();
  await transaction(state => { delete state.sessions[oldToken]; });
  sessionStorage.removeItem(SESSION_KEY);
  announce();
}

export async function commitLocal(command) {
  const sessionToken = token();
  await transaction(state => applyCommand(state, sessionToken, command));
  announce();
}

export async function getLocalSnapshot() {
  return snapshotFor(await transaction(), token());
}

export async function touchLocalSession() {
  const sessionToken = token();
  await transaction(state => {
    if (!resolveSession(state, sessionToken)) throw new Error('Sua sessão expirou.');
    applyCommand(state, sessionToken, { type: 'touch' });
  });
}
