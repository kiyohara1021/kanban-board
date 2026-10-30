import { StatusMessage } from '@/components/StatusMessage'

// 最初に開いたページのファイルを読み込んでいる間の表示（ルートの HydrateFallback）
export function PageLoading() {
  return <StatusMessage>読み込み中…</StatusMessage>
}
