import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Service Worker を登録し、/api へのリクエストをブラウザの中で受け取るようにする。
// ワーカーのファイル（mockServiceWorker.js）は、vite.config.ts の msw プラグインがビルド時に出力する
export async function startDemoWorker() {
  const worker = setupWorker(...handlers)
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    // /api 以外（画像やフォントなど）は、そのままネットワークに流す
    onUnhandledFrame: 'bypass',
    quiet: true,
  })
}
