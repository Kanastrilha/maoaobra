import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { createBackend } from './backend.js';
import { resolveBackendRuntime, fail } from './security.js';
import { FIREBASE_TARGET } from './target.js';

let backend;
const emulated = process.env.FUNCTIONS_EMULATOR === 'true';
const options = { region: FIREBASE_TARGET.region, memory: '256MiB', timeoutSeconds: 30, maxInstances: 2, minInstances: 0, concurrency: 10,
  enforceAppCheck: !emulated, cors: emulated ? [/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/] : FIREBASE_TARGET.origins };
const protect = operation => async request => {
  const runtime = resolveBackendRuntime();
  if (runtime.mode === 'cloud') fail(request.app?.appId === FIREBASE_TARGET.appId, 'Aplicativo não autorizado.');
  if (!backend) { initializeApp({ projectId: runtime.projectId }); backend = createBackend(getFirestore()); }
  try { return await backend[operation](request); }
  catch (error) {
    if (error instanceof HttpsError) throw error;
    // Não registrar payloads, mensagens de chat, credenciais ou erro interno cru.
    logger.error('backend_operation_failed', { code: error.code || 'internal' });
    throw new HttpsError('internal', 'Não foi possível concluir. Tente novamente.');
  }
};
export const executeCommand = onCall(options, protect('execute'));
export const getSnapshot = onCall(options, protect('snapshot'));
