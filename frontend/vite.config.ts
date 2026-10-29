import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // /api へのリクエストをバックエンド（3000 番）に転送する。同じオリジンになるので CORS の設定が不要
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
