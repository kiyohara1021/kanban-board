import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onSave: (value: string) => void
  maxLength: number
  // 入力欄の読み上げ名（例：「カラム名」）
  label: string
  // 表示中の見出しのタグ。ページの見出しは h1、カラムは h2
  heading: 'h1' | 'h2'
  textClassName?: string
}

// 見出しをクリックすると入力欄に切り替わり、その場で名前を変えられる部品。
// ボード名とカラム名の変更で使う
export function InlineEdit({ value, onSave, maxLength, label, heading, textClassName }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  // Esc で取り消したかどうか。画面の表示には使わないので state ではなく ref に持つ
  const cancelledRef = useRef(false)
  const Heading = heading

  function startEditing() {
    setDraft(value)
    cancelledRef.current = false
    setIsEditing(true)
  }

  // Enter・Esc・欄の外をクリック、のどれで終わってもここを通る
  function finishEditing() {
    const trimmed = draft.trim()
    if (!cancelledRef.current && trimmed !== '' && trimmed !== value) onSave(trimmed)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
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
        maxLength={maxLength}
        aria-label={label}
        className="bg-white"
      />
    )
  }

  return (
    <Heading className="min-w-0 flex-1">
      <button
        type="button"
        onClick={startEditing}
        title="クリックして名前を変更"
        className={cn(
          'w-full truncate rounded px-2 py-1 text-left hover:bg-slate-300/60',
          textClassName,
        )}
      >
        {value}
      </button>
    </Heading>
  )
}
