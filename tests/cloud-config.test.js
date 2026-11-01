import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAppConfiguration, getCloudConfiguration } from '../src/firebase.js';
import { FIREBASE_TARGET } from '../functions/src/target.js';
import { resolveBackendRuntime } from '../functions/src/security.js';
import { assertCloudDeploy } from '../scripts/check-cloud-deploy.js';

const publicConfig = {
  VITE_DATA_MODE: 'firebase', VITE_FIREBASE_PROJECT_ID: FIREBASE_TARGET.projectId,
  VITE_FIREBASE_APP_ID: FIREBASE_TARGET.appId, VITE_FIREBASE_AUTH_DOMAIN: `${FIREBASE_TARGET.projectId}.firebaseapp.com`,
  VITE_FIREBASE_API_KEY: 'AIzaTestBuildOnly_12345678901234567890', VITE_APPCHECK_SITE_KEY: 'test_build_only_key_1234567890',
};
test('Nuvem aceita somente o projeto e o aplicativo autorizados, com App Check configurado', () => {
  assert.doesNotThrow(() => assertAppConfiguration(publicConfig));
  assert.equal(getCloudConfiguration(publicConfig).projectId, FIREBASE_TARGET.projectId);
  assert.throws(() => assertAppConfiguration({ ...publicConfig, VITE_FIREBASE_PROJECT_ID: 'outro-projeto' }));
  assert.throws(() => assertAppConfiguration({ ...publicConfig, VITE_FIREBASE_APP_ID: 'outro-app' }));
  assert.throws(() => assertAppConfiguration({ ...publicConfig, VITE_APPCHECK_SITE_KEY: '' }));
  assert.throws(() => assertAppConfiguration({ ...publicConfig, VITE_FIREBASE_AUTH_DOMAIN: 'dominio-invalido.test' }));
});
test('Configuração pública rejeita segredos e nunca os reproduz em erros', () => {
  assert.throws(() => assertAppConfiguration({ ...publicConfig, VITE_SERVICE_ACCOUNT: 'private-test-marker' }), error => !error.message.includes('private-test-marker'));
  assert.throws(() => assertAppConfiguration({ ...publicConfig, VITE_FIREBASE_STORAGE_BUCKET: 'outro-bucket.appspot.com' }));
});
test('Runtime de nuvem falha sem autorização explícita e recusa mistura com emuladores', () => {
  const env = { GCLOUD_PROJECT: FIREBASE_TARGET.projectId, MAOAOBRA_DEPLOYMENT_MODE: 'cloud' };
  assert.deepEqual(resolveBackendRuntime(env), { mode: 'cloud', projectId: FIREBASE_TARGET.projectId });
  assert.throws(() => resolveBackendRuntime({ ...env, MAOAOBRA_DEPLOYMENT_MODE: '' }));
  assert.throws(() => resolveBackendRuntime({ ...env, GCLOUD_PROJECT: 'outro-projeto' }));
  assert.throws(() => resolveBackendRuntime({ ...env, FIREBASE_CONFIG: JSON.stringify({ projectId: 'outro-projeto' }) }));
  assert.throws(() => resolveBackendRuntime({ ...env, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:19099' }));
});
test('Deploy não publica build local ou emulado e precisa confirmar o projeto', () => {
  const env = { GCLOUD_PROJECT: FIREBASE_TARGET.projectId, MAOAOBRA_ALLOW_DEPLOY: FIREBASE_TARGET.projectId };
  assert.doesNotThrow(() => assertCloudDeploy(env, { mode: 'firebase', projectId: FIREBASE_TARGET.projectId }));
  assert.throws(() => assertCloudDeploy(env, { mode: 'local', projectId: null }));
  assert.throws(() => assertCloudDeploy(env, { mode: 'firebase-emulator', projectId: 'demo-maoaobra-copia' }));
  assert.throws(() => assertCloudDeploy({ GCLOUD_PROJECT: FIREBASE_TARGET.projectId }));
  assert.throws(() => assertCloudDeploy({ ...env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:18080' }));
  assert.throws(() => assertCloudDeploy({ ...env, FUNCTIONS_EMULATOR: 'true' }));
});
