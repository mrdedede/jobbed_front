import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd()) // default prefix: VITE_

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/v1': env.VITE_PROXY_TARGET,
        '/healthz': env.VITE_PROXY_TARGET + '/healthz',
      },
    },
  }
})
