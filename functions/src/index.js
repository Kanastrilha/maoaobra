import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { createBackend } from './backend.js';
import { assertEmulatorRuntime } from './security.js';
import { DEMO_PROJECT } from './config.js';

initializeApp({ projectId: DEMO_PROJECT });
const backend = createBackend(getFirestore());
const options = { region: 'southamerica-east1', memory: '256MiB', timeoutSeconds: 30, maxInstances: 3, concurrency: 10,
  enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true', cors: [/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/] };
const protect = handler => async request => {
  assertEmulatorRuntime();
  try { return await handler(request); }
  catch (error) {
    if (error instanceof HttpsError) throw error;
    // Não registrar payloads, mensagens de chat, credenciais ou erro interno cru.
    logger.error('backend_operation_failed', { code: error.code || 'internal' });
    throw new HttpsError('internal', 'Não foi possível concluir. Tente novamente.');
  }
};
export const executeCommand = onCall(options, protect(backend.execute));
export const getSnapshot = onCall(options, protect(backend.snapshot));
