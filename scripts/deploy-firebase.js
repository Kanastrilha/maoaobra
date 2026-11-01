import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FIREBASE_TARGET } from '../functions/src/target.js';
import { assertCloudDeploy } from './check-cloud-deploy.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, GCLOUD_PROJECT: FIREBASE_TARGET.projectId, MAOAOBRA_ALLOW_DEPLOY: FIREBASE_TARGET.projectId };
assertCloudDeploy(env);
// Recompila com a configuração local real; não reutiliza builds sintéticos do CI.
const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'firebase'], { cwd: root, env, stdio: 'inherit', windowsHide: true });
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
const result = spawnSync(process.execPath, ['node_modules/firebase-tools/lib/bin/firebase.js', 'deploy', '--project', FIREBASE_TARGET.projectId,
  '--only', 'functions:maoaobra-copia,firestore:rules,firestore:indexes,storage,hosting', '--non-interactive'], { cwd: root, env, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
