import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { assertAppConfiguration } from './src/firebase.js'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  // Falha antes de compilar, em vez de incluir configurações indevidas no bundle.
  assertAppConfiguration(loadEnv(mode, projectRoot, 'VITE_'))
  return {
    plugins: [react(), tailwindcss()],
    base: '/maoaobra-copia/',
    server: { host: '127.0.0.1', strictPort: true },
    preview: { host: '127.0.0.1', strictPort: true },
  }
})
