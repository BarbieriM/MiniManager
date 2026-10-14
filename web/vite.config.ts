import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Fail when 5173 is taken instead of moving to another port, so the app's URL never changes silently.
    strictPort: true,
    proxy: {
      // The end-to-end tests point this at their own API (scripts/e2e.sh); `make dev` uses the default.
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
})
