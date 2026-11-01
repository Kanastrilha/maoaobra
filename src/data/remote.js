import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, browserSessionPersistence, setPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onIdTokenChanged, sendEmailVerification, sendPasswordResetEmail, getIdToken } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { DEMO_PROJECT as PROJECT, EMULATOR_PORTS } from '../../functions/src/config.js';
import { FIREBASE_TARGET } from '../../functions/src/target.js';
import { DATA_MODE, getCloudConfiguration } from '../firebase.js';

let auth, db, functions;
const listeners = new Set();
function friendly(error) {
  const code = error.code?.replace(/^(auth|functions)\//, '');
  const messages = {
    'invalid-credential': 'E-mail ou senha incorretos.', 'user-not-found': 'E-mail ou senha incorretos.', 'wrong-password': 'E-mail ou senha incorretos.',
    'email-already-in-use': 'Não foi possível concluir o cadastro com este e-mail. Tente entrar ou recuperar a senha.',
    'invalid-email': 'Informe um e-mail válido.', 'too-many-requests': 'Muitas tentativas. Aguarde antes de tentar novamente.',
    'network-request-failed': 'Não foi possível conectar. Verifique sua conexão e tente novamente.',
    'unavailable': 'Backend indisponível. Tente novamente em instantes.', 'internal': 'O backend não respondeu. Tente novamente.',
  };
  return new Error(messages[code] || error.message || 'Não foi possível concluir a operação.');
}
async function call(name, data) {
  try { return (await httpsCallable(functions, name)(data)).data; }
  catch (error) { throw friendly(error); }
}
export async function initializeLocalDatabase() {
  if (auth) return;
  const emulated = DATA_MODE === 'firebase-emulator';
  if (emulated && !['127.0.0.1', 'localhost'].includes(window.location.hostname)) throw new Error('O modo emulador só funciona neste computador.');
  const config = emulated ? { projectId: PROJECT, apiKey: 'emulator-only-api-key', authDomain: `${PROJECT}.firebaseapp.com`, storageBucket: `${PROJECT}.appspot.com` } : getCloudConfiguration();
  const app = initializeApp(config, emulated ? 'backend-emulator' : 'backend-cloud');
  auth = getAuth(app); db = getFirestore(app); functions = getFunctions(app, FIREBASE_TARGET.region);
  if (emulated) {
    connectAuthEmulator(auth, `http://127.0.0.1:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', EMULATOR_PORTS.firestore);
    connectFunctionsEmulator(functions, '127.0.0.1', EMULATOR_PORTS.functions);
  } else {
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_APPCHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }
  await setPersistence(auth, browserSessionPersistence);
  await auth.authStateReady();
}
export function subscribeLocal(onData, onError) {
  let active = true, generation = 0, timer, privateStops = [];
  const refresh = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const current = ++generation;
      try { const result = await getLocalSnapshot(); if (active && current === generation) onData(result); }
      catch (error) { if (active && current === generation) onError(error); }
    }, 50);
  };
  const listen = (collection, id) => onSnapshot(doc(db, collection, id), refresh, error => { if (active) onError(friendly(error)); });
  const stopPublic = listen('meta', 'public');
  const stopAuth = onIdTokenChanged(auth, async user => {
    privateStops.forEach(stop => stop()); privateStops = []; generation++;
    if (user) {
      privateStops.push(listen('sync', user.uid));
      const token = await user.getIdTokenResult();
      if (active && auth.currentUser?.uid === user.uid && token.claims.admin === true) privateStops.push(listen('meta', 'admin'));
    }
    refresh();
  });
  listeners.add(refresh); refresh();
  return () => { active = false; generation++; clearTimeout(timer); stopPublic(); stopAuth(); privateStops.forEach(stop => stop()); listeners.delete(refresh); };
}
export const getLocalSnapshot = () => call('getSnapshot', {});
export async function loginLocal(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (!credential.user.emailVerified) throw new Error('Confirme seu e-mail antes de entrar.');
    const snapshot = await getLocalSnapshot();
    if (!snapshot.currentUser) throw new Error('Cadastro profissional pendente, recusado ou conta indisponível.');
    return snapshot.currentUser;
  } catch (error) { await signOut(auth); throw friendly(error); }
}
export async function registerLocal(userData, details) {
  let credential;
  try {
    if (userData.senha.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
    try { credential = await createUserWithEmailAndPassword(auth, userData.email.trim(), userData.senha); }
    catch (error) {
      if (error.code !== 'auth/email-already-in-use') throw error;
      // Recupera cadastro interrompido somente após provar a mesma credencial.
      credential = await signInWithEmailAndPassword(auth, userData.email.trim(), userData.senha);
    }
    const result = await call('executeCommand', { requestId: `register_${credential.user.uid}`, command: {
      type: 'register', user: { nome: userData.nome, telefone: userData.telefone, role: userData.role }, details,
    } });
    await sendEmailVerification(credential.user);
    return result.user;
  } catch (error) {
    // Não apagar Auth após falha de rede: o backend pode ter confirmado o cadastro.
    throw friendly(error);
  } finally { await signOut(auth); }
}
export const logoutLocal = () => signOut(auth);
export async function commitLocal(input) {
  const command = structuredClone(input);
  // A interface antiga envia autor e horário; quem os determina é o servidor.
  if (command.type === 'sendMessage') { delete command.message.sender; delete command.message.time; }
  if (command.type === 'saveService') command.service = Object.fromEntries(['id', 'titulo', 'descricao', 'preco_base', 'imagem_url'].map(key => [key, command.service[key] ?? '']));
  await call('executeCommand', { requestId: crypto.randomUUID(), command });
  listeners.forEach(refresh => refresh());
}
export async function touchLocalSession() {
  if (!auth.currentUser) throw new Error('Entre novamente.');
  await getIdToken(auth.currentUser);
}
export async function resetPassword(email) {
  try { await sendPasswordResetEmail(auth, email.trim()); }
  catch (error) { if (!['auth/user-not-found', 'auth/invalid-credential'].includes(error.code)) throw friendly(error); }
}
export async function sendVerification(email, password) {
  try { const credential = await signInWithEmailAndPassword(auth, email.trim(), password); await sendEmailVerification(credential.user); }
  catch (error) { throw friendly(error); }
  finally { await signOut(auth); }
}
