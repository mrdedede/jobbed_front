import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd()) // default prefix: VITE_

  return {
    plugins: [react()],
    server: {
      // The proxy appends the request path to the target.
      proxy: {
        '/v1': env.VITE_PROXY_TARGET,
        '/healthz': env.VITE_PROXY_TARGET,
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      // Headroom for slow machines (the Docker build runs the tests too).
      testTimeout: 15_000,
    },
  }
})
