import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { Toaster } from './components/ui/sonner'
import { queryClient } from './lib/queryClient'
import { routes } from './routes'

const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* この中のコンポーネントは、useQuery / useMutation で同じキャッシュを使う */}
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* toast.error(...) などで出す通知の表示場所 */}
      <Toaster position="bottom-center" richColors />
    </QueryClientProvider>
  </StrictMode>,
)
