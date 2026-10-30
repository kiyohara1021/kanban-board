import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from './ErrorFallback'

type Props = {
  children: ReactNode
  // この配列の中身が変わったら、エラーの表示をやめて描き直す（例：取り直したデータ）
  resetKeys?: unknown[]
}

// ページの一部だけを包むエラーバウンダリー。中で描画中のエラーが起きても、
// 外側（ヘッダーなど）はそのまま残り、壊れた部分だけがエラーの表示に替わる
export function SectionErrorBoundary({ children, resetKeys }: Props) {
  // 「再試行」で、エラーを throw したクエリも取り直させる（app/provider.tsx と同じ）
  const { reset } = useQueryErrorResetBoundary()

  return (
    <ErrorBoundary
      onReset={reset}
      resetKeys={resetKeys}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback error={error} retryLabel="再試行" onRetry={resetErrorBoundary} />
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
