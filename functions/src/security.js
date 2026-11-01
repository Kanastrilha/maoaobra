import { HttpsError } from 'firebase-functions/v2/https';
import { DEMO_PROJECT, EMULATOR_PORTS } from './config.js';

export { DEMO_PROJECT };
export const fail = (condition, message = 'Operação não permitida.', code = 'permission-denied') => {
  if (!condition) throw new HttpsError(code, message);
};
export function assertEmulatorRuntime(env = process.env) {
  // Nenhuma credencial de nuvem ou fallback remoto é aceito nesta etapa.
  const config = JSON.parse(env.FIREBASE_CONFIG || '{}');
  const project = env.GCLOUD_PROJECT || config.projectId;
  fail(env.FUNCTIONS_EMULATOR === 'true' && project === DEMO_PROJECT
    && (!config.projectId || config.projectId === DEMO_PROJECT)
    && env.FIRESTORE_EMULATOR_HOST === `127.0.0.1:${EMULATOR_PORTS.firestore}`
    && env.FIREBASE_AUTH_EMULATOR_HOST === `127.0.0.1:${EMULATOR_PORTS.auth}`,
  'Este backend está habilitado somente nos emuladores isolados.', 'failed-precondition');
}
export function requireIdentity(request, verified = true) {
  fail(request.auth?.uid, 'Entre na sua conta.', 'unauthenticated');
  if (verified) fail(request.auth.token.email_verified === true, 'Confirme seu e-mail antes de continuar.', 'failed-precondition');
  return request.auth.uid;
}
export function isAdmin(account, request) {
  return account?.status === 'APPROVED' && account.role === 'ADMIN' && request.auth?.token.admin === true && request.auth.token.email_verified === true;
}
export function requireAdmin(account, request) {
  fail(isAdmin(account, request), 'Apenas a administração pode executar esta ação.');
}
export const publicDetails = details => Object.fromEntries(['user_id', 'bio', 'categorias', 'portfolio_fotos', 'banner_url', 'cidade', 'uf', 'isOnline', 'horaInicio', 'horaFim', 'diasTrabalho', 'timeZone'].map(key => [key, details[key] ?? (['categorias', 'portfolio_fotos'].includes(key) ? [] : '')]));
export const publicAccount = account => Object.fromEntries(['id', 'nome', 'role', 'status', 'foto_perfil_url', 'data_criacao'].map(key => [key, account[key] ?? '']));
