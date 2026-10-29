import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from './components/ui/sonner'
import { queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* この中のコンポーネントは、useQuery / useMutation で同じキャッシュを使う */}
    <QueryClientProvider client={queryClient}>
      <App />
      {/* toast.error(...) などで出す通知の表示場所 */}
      <Toaster position="bottom-center" richColors />
    </QueryClientProvider>
  </StrictMode>,
)
