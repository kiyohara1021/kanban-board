import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
// vitest/config の defineConfig は、Vite の設定に test の項目を加えたもの
import { defineConfig } from 'vitest/config'

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
  test: {
    // 画面のテストのため、ブラウザの代わりに jsdom で DOM を用意する
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
