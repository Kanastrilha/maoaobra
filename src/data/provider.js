import { DATA_MODE, assertAppConfiguration } from '../firebase.js';

let adapter;
export async function initializeLocalDatabase() {
  assertAppConfiguration();
  adapter ||= await (DATA_MODE !== 'local' ? import('./remote.js') : import('./local.js'));
  await adapter.initializeLocalDatabase();
}
const ready = () => {
  if (!adapter) throw new Error('O serviço de dados ainda está sendo inicializado.');
  return adapter;
};
export const subscribeLocal = (...args) => ready().subscribeLocal(...args);
export const loginLocal = (...args) => ready().loginLocal(...args);
export const registerLocal = (...args) => ready().registerLocal(...args);
export const logoutLocal = (...args) => ready().logoutLocal(...args);
export const commitLocal = (...args) => ready().commitLocal(...args);
export const getLocalSnapshot = (...args) => ready().getLocalSnapshot(...args);
export const touchLocalSession = (...args) => ready().touchLocalSession(...args);
export const resetPassword = (...args) => ready().resetPassword ? ready().resetPassword(...args) : Promise.reject(new Error('Recuperação por e-mail está disponível no modo Firebase.'));
export const sendVerification = (...args) => ready().sendVerification ? ready().sendVerification(...args) : Promise.reject(new Error('Verificação por e-mail está disponível no modo Firebase.'));
