import { QueryClientProvider, useQueryErrorResetBoundary } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { ErrorFallback } from '@/components/ErrorFallback'
import { Toaster } from '@/components/ui/sonner'
import { DemoBanner } from '@/demo/DemoBanner'
import { queryClient } from '@/lib/queryClient'

// デモ版（GitHub Pages 用に npm run build:demo でビルドしたとき）だけ true になる
const isDemo = import.meta.env.VITE_DEMO === 'true'

// アプリ全体で使う Provider をまとめる（bulletproof-react の app/provider.tsx にならった）。
// main.tsx を起動の処理だけにして、「どの順で何に包まれているか」をこのファイルで見渡せるようにする
export function AppProvider({ children }: { children: ReactNode }) {
  // 「再試行」のときに、エラーを throw したクエリ（throwOnError や useSuspenseQuery を使うもの）を
  // 取り直させるための関数。これを呼ばないと、エラーのまま再表示されてすぐ同じ画面に戻る
  const { reset } = useQueryErrorResetBoundary()

  return (
    <>
      {/* 一番外側のエラーバウンダリー。ページのエラーはルートの ErrorBoundary（app/routes/）が先に
          受け止めるので、ここに届くのはルーターの外（Provider や通知など）で起きたエラーだけ */}
      <ErrorBoundary FallbackComponent={AppErrorFallback} onReset={reset}>
        {/* この中のコンポーネントは、useQuery / useMutation で同じキャッシュを使う */}
        <QueryClientProvider client={queryClient}>
          {children}
          {/* toast.error(...) などで出す通知の表示場所 */}
          <Toaster position="bottom-center" richColors />
        </QueryClientProvider>
      </ErrorBoundary>
      {/* エラー画面でも「初期状態に戻す」を押せるよう、エラーバウンダリーの外に置く
          （デモのデータが壊れて表示できなくなったときの逃げ道） */}
      {isDemo && <DemoBanner />}
    </>
  )
}

// resetErrorBoundary を呼ぶと、エラーバウンダリーが中身を描き直す（onReset も呼ばれる）
function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return <ErrorFallback error={error} retryLabel="再試行" onRetry={resetErrorBoundary} fullScreen />
}
