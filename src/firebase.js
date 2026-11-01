import { FIREBASE_TARGET } from '../functions/src/target.js';

// Os modos local e emulado não usam configurações ou credenciais de nuvem.
export const DATA_MODE = import.meta.env?.VITE_DATA_MODE || 'local';
export const DATABASE_NAME = 'maoaobra-copia-v1';

export function assertLocalConfiguration(env = import.meta.env || {}) {
  if (env.VITE_DATA_MODE && env.VITE_DATA_MODE !== 'local') {
    throw new Error('Esta cópia está isolada. A conexão com um banco remoto ainda não está habilitada.');
  }
  if (Object.keys(env).some(key => key.startsWith('VITE_FIREBASE_') && env[key])) {
    throw new Error('Remova as variáveis VITE_FIREBASE_ desta cópia local. Nenhuma conexão remota será iniciada.');
  }
  if (Object.keys(env).some(key => key.startsWith('VITE_') && key !== 'VITE_DATA_MODE')) {
    // Toda variável VITE_ pode entrar no JavaScript público, inclusive em builds.
    // Não inclua valores na mensagem: a configuração pode conter segredos.
    throw new Error('Esta cópia aceita somente VITE_DATA_MODE. Variáveis VITE_ são públicas; não use esse prefixo para segredos.');
  }
}

export function assertAppConfiguration(env = import.meta.env || {}) {
  if (env.VITE_DATA_MODE === 'firebase') { getCloudConfiguration(env); return; }
  if (env.VITE_DATA_MODE === 'firebase-emulator') {
    // O modo remoto continua indisponível. Nenhuma configuração Firebase de nuvem.
    const other = Object.keys(env).some(key => key.startsWith('VITE_') && key !== 'VITE_DATA_MODE');
    if (other) throw new Error('O modo emulador não aceita configurações de nuvem ou segredos VITE_.');
    return;
  }
  assertLocalConfiguration(env);
}

export function getCloudConfiguration(env = import.meta.env || {}) {
  const allowed = ['VITE_DATA_MODE', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_APPCHECK_SITE_KEY'];
  if (Object.keys(env).some(key => key.startsWith('VITE_') && !allowed.includes(key))) throw new Error('Variável pública não permitida na configuração Firebase.');
  if (env.VITE_FIREBASE_PROJECT_ID !== FIREBASE_TARGET.projectId || env.VITE_FIREBASE_APP_ID !== FIREBASE_TARGET.appId) throw new Error('O Firebase deve corresponder ao destino explicitamente autorizado.');
  if (env.VITE_FIREBASE_AUTH_DOMAIN !== `${FIREBASE_TARGET.projectId}.firebaseapp.com`) throw new Error('Domínio de autenticação inválido.');
  if (!/^AIza[\w-]{20,}$/.test(env.VITE_FIREBASE_API_KEY || '')) throw new Error('Configure a chave pública do aplicativo Firebase.');
  if (!/^[\w-]{20,}$/.test(env.VITE_APPCHECK_SITE_KEY || '')) throw new Error('Configure a chave pública reCAPTCHA Enterprise do App Check.');
  if (env.VITE_FIREBASE_STORAGE_BUCKET && ![`${FIREBASE_TARGET.projectId}.firebasestorage.app`, `${FIREBASE_TARGET.projectId}.appspot.com`].includes(env.VITE_FIREBASE_STORAGE_BUCKET)) throw new Error('Bucket diferente do projeto autorizado.');
  return { projectId: FIREBASE_TARGET.projectId, appId: FIREBASE_TARGET.appId, apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${FIREBASE_TARGET.projectId}.firebasestorage.app` };
}
