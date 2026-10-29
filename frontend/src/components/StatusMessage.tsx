import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  children?: ReactNode
  error?: Error
  onRetry?: () => void
}

// 読み込み中・エラー・ページが見つからないときに、画面の中央に出すメッセージ
export function StatusMessage({ children, error, onRetry }: Props) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-slate-100 p-4 text-center text-sm text-slate-600">
      {error && <p className="text-red-600">{error.message}</p>}
      {children}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          再読み込み
        </Button>
      )}
    </div>
  )
}
