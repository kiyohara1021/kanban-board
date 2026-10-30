import { useRouteError } from 'react-router'
import { ErrorFallback } from '@/components/ErrorFallback'

// ページの描画中のエラーや、ページのファイルの読み込みの失敗（lazy）を受け止めて出す画面。
// React Router は、ルートの ErrorBoundary に指定したコンポーネントを、エラーが起きたページの代わりに描く
export function RouteErrorBoundary() {
  // 受け止めたエラーは props ではなく、このフックで受け取る
  const error = useRouteError()

  // 公開し直すとページのファイル名が変わり、開いたままの画面からは古いファイルを読み込めなくなる。
  // ページを読み込み直せば新しいファイルを取りに行くので、ここでは「再読み込み」にする
  return (
    <ErrorFallback
      error={error}
      retryLabel="再読み込み"
      onRetry={() => window.location.reload()}
      fullScreen
    />
  )
}
