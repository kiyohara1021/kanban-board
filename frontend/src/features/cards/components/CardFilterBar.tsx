import type { Label } from '@kanban/shared'
import { Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LabelChip } from '@/features/labels/components/LabelChip'
import { cn } from '@/lib/utils'
import { emptyCardFilter, isFiltering, type CardFilter } from '../cardFilter'

type Props = {
  filter: CardFilter
  // ボードのラベル一覧。ここから絞り込みに使うラベルを選ぶ
  labels: Label[]
  // 条件に合ったカードの枚数
  matchCount: number
  onChange: (filter: CardFilter) => void
}

// ボード画面のヘッダーの下に置く、カードの検索・絞り込みの欄
export function CardFilterBar({ filter, labels, matchCount, onChange }: Props) {
  // 入力欄に表示する文字。日本語入力の変換中は絞り込み（URL）に反映しないので、
  // URL の q とは別に持つ。q をそのまま入力欄の値にすると、変換中の文字が消えてしまう
  const [text, setText] = useState(filter.text)
  const inputRef = useRef<HTMLInputElement>(null)
  const filtering = isFiltering(filter)

  function toggleLabel(labelId: string) {
    const labelIds = filter.labelIds.includes(labelId)
      ? filter.labelIds.filter((id) => id !== labelId)
      : [...filter.labelIds, labelId]
    onChange({ ...filter, labelIds })
  }

  function clear() {
    setText('')
    onChange(emptyCardFilter)
    // 押したボタンは消えるので、フォーカスが行き場をなくさないよう入力欄に移す
    inputRef.current?.focus()
  }

  return (
    <div
      role="search"
      aria-label="カードの絞り込み"
      className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2"
    >
      <div className="relative w-64 max-w-full">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-slate-400"
        />
        <Input
          ref={inputRef}
          type="search"
          aria-label="カードを検索"
          placeholder="カードを検索"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            // 変換中（isComposing）は絞り込まない。変換中の「ｒ」「れ」のような途中の文字で表示がちらつくのと、
            // 1文字ごとに絞り込み直すのを避けるため。確定したときは onCompositionEnd で絞り込む。
            // 入力欄の onChange の元になるのは input イベント（InputEvent）だが、React の型は Event なので InputEvent として読む
            const { isComposing } = event.nativeEvent as InputEvent
            if (!isComposing) onChange({ ...filter, text: event.target.value })
          }}
          onCompositionEnd={(event) => onChange({ ...filter, text: event.currentTarget.value })}
          className="bg-white pl-7"
        />
      </div>

      {labels.length > 0 && (
        <div role="group" aria-label="ラベルで絞り込む" className="flex flex-wrap gap-1">
          {labels.map((label) => {
            const selected = filter.labelIds.includes(label.id)
            return (
              // aria-pressed で、押した状態（選んでいるか）が読み上げでも伝わる
              <button
                key={label.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleLabel(label.id)}
                className={cn(
                  // フォーカスは外側の線（outline）で示し、選んだ状態の枠（ring）と見分けられるようにする
                  'rounded-full p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700',
                  // 選んだラベルは枠で示し、選んでいないものは薄くする（色だけに頼らない）
                  selected ? 'ring-2 ring-sky-500' : 'opacity-60 hover:opacity-100',
                )}
              >
                <LabelChip label={label} />
              </button>
            )
          })}
        </div>
      )}

      {/* role="status" は aria-live="polite" と同じ。中の文字が変わると、スクリーンリーダーが読み上げる。
          読み上げてもらうには、文字が変わる前からこの要素が画面にある必要があるので、常に置いておく */}
      <p role="status" className="text-sm text-slate-600">
        {filtering && `${matchCount}枚のカードが見つかりました`}
      </p>

      {filtering && (
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          条件をクリア
        </Button>
      )}
    </div>
  )
}
