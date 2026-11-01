// Dois modos isolados: demonstração IndexedDB ou Firebase Emulator Suite.
// A configuração de nuvem continua indisponível nesta etapa.
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
  if (env.VITE_DATA_MODE === 'firebase-emulator') {
    // O modo remoto continua indisponível. Nenhuma configuração Firebase de nuvem.
    const other = Object.keys(env).some(key => key.startsWith('VITE_') && key !== 'VITE_DATA_MODE');
    if (other) throw new Error('O modo emulador não aceita configurações de nuvem ou segredos VITE_.');
    return;
  }
  assertLocalConfiguration(env);
}
