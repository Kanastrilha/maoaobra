import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, FIREBASE_EMULATORS_PATH: path.join(root, '.emulator-cache'), FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true' };
const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
const originalPath = process.env.PATH || process.env.Path || '';
for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
env[pathKey] = `${path.dirname(process.execPath)}${path.delimiter}${originalPath}`;
delete env.GOOGLE_APPLICATION_CREDENTIALS;
mkdirSync(env.FIREBASE_EMULATORS_PATH, { recursive: true });
// Evita os atalhos Oracle que podem abrir instaladores ou apontar para Java 8.
const candidates = [env.JAVA_HOME, process.platform === 'win32' ? 'C:/Program Files/Java/jdk-21' : undefined].filter(Boolean);
for (const home of candidates) {
  const executable = path.join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
  if (!existsSync(executable)) continue;
  const version = spawnSync(executable, ['-version'], { encoding: 'utf8', timeout: 5000 });
  if (/version "(2[1-9]|[3-9]\d)[."]/.test(version.stderr || '')) { env.JAVA_HOME = home; env[pathKey] = `${path.join(home, 'bin')}${path.delimiter}${env[pathKey]}`; break; }
}
const cli = path.join(root, 'node_modules/firebase-tools/lib/bin/firebase.js');
const mode = process.argv[2];
if (!['start', 'test'].includes(mode)) throw new Error('Use start ou test.');
const args = [cli, mode === 'test' ? 'emulators:exec' : 'emulators:start', '--config', 'firebase.json', '--project', 'demo-maoaobra-copia', '--only', 'auth,firestore,functions,storage'];
if (mode === 'test') args.push('node --test --test-concurrency=1 tests/backend/*.test.js');
const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
