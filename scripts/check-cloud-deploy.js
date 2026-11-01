import { readFileSync } from 'node:fs';
import { FIREBASE_TARGET } from '../functions/src/target.js';

export function assertCloudDeploy(env = process.env, deployment) {
  if (env.GCLOUD_PROJECT !== FIREBASE_TARGET.projectId || env.MAOAOBRA_ALLOW_DEPLOY !== FIREBASE_TARGET.projectId) throw new Error('Implantação bloqueada: confirme explicitamente o projeto autorizado pelo script deploy:firebase.');
  if (env.FUNCTIONS_EMULATOR || Object.keys(env).some(key => /EMULATOR_(HOST|HUB)$/.test(key) && env[key])) throw new Error('Remova variáveis de emulador antes de implantar na nuvem.');
  if (deployment && (deployment.mode !== 'firebase' || deployment.projectId !== FIREBASE_TARGET.projectId)) throw new Error('O Hosting aceita somente uma compilação Firebase real para o projeto autorizado.');
}
if (process.argv[1]?.endsWith('check-cloud-deploy.js')) {
  const metadata = process.argv[2] === 'hosting' ? JSON.parse(readFileSync(new URL('../dist/deployment.json', import.meta.url), 'utf8')) : undefined;
  assertCloudDeploy(process.env, metadata);
  console.log('Destino de implantação verificado.');
}
