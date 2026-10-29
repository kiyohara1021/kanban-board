import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { Toaster } from './components/ui/sonner'
import { DemoBanner } from './demo/DemoBanner'
import { queryClient } from './lib/queryClient'
import { routes } from './routes'

// デモ版（GitHub Pages 用に npm run build:demo でビルドしたとき）だけ true になる
const isDemo = import.meta.env.VITE_DEMO === 'true'

// GitHub Pages では /kanban-board/ の下で公開されるので、URL の先頭（basename）を合わせる
const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })

// デモ版では、バックエンドの代わりに MSW がブラウザの中で API を再現する。
// 通常のビルドには含めないよう、必要なときだけ読み込む（動的 import）
async function startDemoIfNeeded() {
  if (!isDemo) return
  const { startDemoWorker } = await import('./demo/browser')
  await startDemoWorker()
}

// API の準備ができてから画面を描く（先に描くと、最初の取得が MSW に届かない）
startDemoIfNeeded().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* この中のコンポーネントは、useQuery / useMutation で同じキャッシュを使う */}
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {/* toast.error(...) などで出す通知の表示場所 */}
        <Toaster position="bottom-center" richColors />
        {isDemo && <DemoBanner />}
      </QueryClientProvider>
    </StrictMode>,
  )
})
