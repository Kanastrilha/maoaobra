import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { assertAppConfiguration } from './src/firebase.js'
import { FIREBASE_TARGET } from './functions/src/target.js'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  // Falha antes de compilar, em vez de incluir configurações indevidas no bundle.
  const env = loadEnv(mode, projectRoot, 'VITE_')
  assertAppConfiguration(env)
  const dataMode = env.VITE_DATA_MODE || 'local'
  return {
    plugins: [react(), tailwindcss(), {
      name: 'deployment-metadata',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'deployment.json', source: JSON.stringify({ mode: dataMode, projectId: dataMode === 'firebase' ? FIREBASE_TARGET.projectId : null }) })
      },
    }],
    base: dataMode === 'firebase' ? '/' : '/maoaobra-copia/',
    server: { host: '127.0.0.1', strictPort: true },
    preview: { host: '127.0.0.1', strictPort: true },
  }
})
