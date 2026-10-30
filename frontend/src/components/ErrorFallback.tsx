import { getErrorMessage } from 'react-error-boundary'
import { isRouteErrorResponse } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  // throw された値。Error とは限らない（文字列や、React Router のエラーレスポンスのこともある）
  error: unknown
  // どう立て直すかは、エラーを受け止めた場所によって違うので、ボタンは使う側が決める
  retryLabel: string
  onRetry: () => void
  // true：画面全体に出す（アプリ・ルートのエラー）。false：ページの一部に出す（ボードの表示部分）
  fullScreen?: boolean
}

// 描画中のエラーを受け止めたときに、壊れた部分の代わりに出す画面。
// 読み込みの失敗（StatusMessage）と違い、プログラムの不具合なども含むので、元のメッセージも小さく添える
export function ErrorFallback({ error, retryLabel, onRetry, fullScreen = false }: Props) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-4 text-center text-sm text-slate-600',
        fullScreen ? 'h-dvh bg-slate-100' : 'min-h-0 flex-1',
      )}
    >
      <p className="text-base font-bold text-slate-800">画面の表示中に問題が発生しました</p>
      <p>{retryLabel}しても直らないときは、時間をおいてから開き直してください。</p>
      <p className="max-w-md text-xs break-all text-slate-400">{errorMessage(error)}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
        {/* ページの一部のときは、ヘッダーに一覧へ戻るリンクが残っているので出さない。
            <Link> ではなく <a> にしているのは、ルーターの外（アプリ全体のエラー）でも使い、
            ページを読み込み直して状態をまっさらにするため */}
        {fullScreen && (
          <a href={import.meta.env.BASE_URL} className="text-sky-700 underline">
            ボード一覧に戻る
          </a>
        )}
      </div>
    </div>
  )
}

function errorMessage(error: unknown) {
  // React Router が作るエラー（404 など）は Error ではないので、ステータスを出す
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  return getErrorMessage(error) ?? String(error)
}
