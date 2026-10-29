import { X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { COLUMN_TITLE_MAX } from '@/features/boards/limits'

type Props = {
  title: string
  cardCount: number
  onRename: (title: string) => void
  onDelete: () => void
  // カラムをドラッグする取っ手。ドラッグの仕組みは BoardColumn が持ち、ここでは置く場所だけ決める
  dragHandle: ReactNode
}

export function ColumnHeader({ title, cardCount, onRename, onDelete, dragHandle }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  // Esc で取り消したかどうか。画面の表示には使わないので state ではなく ref に持つ
  const cancelledRef = useRef(false)

  function startEditing() {
    setDraft(title)
    cancelledRef.current = false
    setIsEditing(true)
  }

  // Enter・Esc・欄の外をクリック、のどれで終わってもここを通る
  function finishEditing() {
    const trimmed = draft.trim()
    if (!cancelledRef.current && trimmed !== '' && trimmed !== title) onRename(trimmed)
    setIsEditing(false)
  }

  return (
    <div className="flex items-center gap-1">
      {dragHandle}
      {isEditing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={finishEditing}
          onKeyDown={(event) => {
            // 日本語入力の変換確定の Enter では終了しない
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              cancelledRef.current = true
              event.currentTarget.blur()
            }
          }}
          maxLength={COLUMN_TITLE_MAX}
          aria-label="カラム名"
          className="bg-white"
        />
      ) : (
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={startEditing}
            title="クリックして名前を変更"
            className="w-full truncate rounded px-2 py-1 text-left text-sm font-semibold text-slate-700 hover:bg-slate-300/60"
          >
            {title}
          </button>
        </h2>
      )}
      <span className="shrink-0 rounded-full bg-slate-300 px-2 text-xs text-slate-600">
        {cardCount}
      </span>
      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`「${title}」を削除`}
            className="text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <X />
          </Button>
        }
        title={`「${title}」を削除しますか？`}
        description={
          cardCount === 0
            ? 'この操作は取り消せません。'
            : `中のカード${cardCount}枚も削除されます。この操作は取り消せません。`
        }
        onConfirm={onDelete}
      />
    </div>
  )
}
