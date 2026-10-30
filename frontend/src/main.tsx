import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import './index.css'

// 起動の処理だけを書く。Provider とルートは app/ にある

// デモ版では、バックエンドの代わりに MSW がブラウザの中で API を再現する。
// 通常のビルドに MSW を含めないよう、必要なときだけ読み込む（動的 import）
async function startDemoIfNeeded() {
  if (import.meta.env.VITE_DEMO !== 'true') return
  const { startDemoWorker } = await import('./demo/browser')
  await startDemoWorker()
}

// API の準備ができてから画面を描く（先に描くと、最初の取得が MSW に届かない）
startDemoIfNeeded().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
