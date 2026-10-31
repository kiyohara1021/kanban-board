import {
  LABEL_COLORS,
  LABEL_NAME_MAX,
  type CreateLabelInput,
  type Label,
  type LabelColor,
} from '@kanban/shared'
import { X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { labelColorStyles } from '../labelColors'
import { LabelChip } from './LabelChip'

type Props = {
  // ボードのラベル一覧
  labels: Label[]
  // このカードに付けるラベル（保存前の選択）
  selectedIds: string[]
  onToggle: (labelId: string) => void
  // 作ったラベルが届いたら onCreated が呼ばれる
  onCreate: (input: CreateLabelInput, onCreated: (label: Label) => void) => void
  isCreating: boolean
  onDelete: (labelId: string) => void
}

// カード詳細の中で、ラベルを選ぶ・作る・消す部品
export function LabelPicker({
  labels,
  selectedIds,
  onToggle,
  onCreate,
  isCreating,
  onDelete,
}: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<LabelColor>('green')
  // 同じ name のラジオボタンが1つのグループになる。ほかの部品と重ならない名前を React に作らせる
  const colorGroupName = useId()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const trimmedName = name.trim()
  const canCreate = trimmedName !== '' && !isCreating

  function create() {
    if (!canCreate) return
    // 作成中はボタンを押せなくなり、押したボタンからフォーカスが外れてしまう。
    // 名前の入力欄に戻しておき、キーボードでもそのまま次のラベルを作れるようにする
    nameInputRef.current?.focus()
    // 作ったラベルは、そのままこのカードに付ける（選んだ状態にする）
    onCreate({ name: trimmedName, color }, (label) => {
      onToggle(label.id)
      setName('')
    })
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">ラベル</legend>

      {labels.length === 0 ? (
        <p className="text-sm text-slate-500">ラベルはまだありません</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <li key={label.id} className="flex items-center rounded-full border border-slate-200">
              {/* チェックボックスにすると、キーボード（Tab と Space）でも付け外しでき、
                  読み上げでも「チェックあり／なし」で状態が伝わる */}
              <label className="flex cursor-pointer items-center gap-1.5 py-1 pr-1 pl-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(label.id)}
                  onChange={() => onToggle(label.id)}
                  className="size-4 accent-sky-600"
                />
                <LabelChip label={label} />
              </label>
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`ラベル「${label.name}」を削除`}
                    className="mr-1 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <X />
                  </Button>
                }
                title={`ラベル「${label.name}」を削除しますか？`}
                description="このラベルを付けているすべてのカードから外れます。この操作は取り消せません。"
                onConfirm={() => onDelete(label.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* カード詳細の <form> の中にあるので、ここに <form> を入れ子にはできない。
          そのため Enter キーとボタンのクリックを自分で扱う */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
        <Input
          ref={nameInputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            // 日本語入力の変換確定の Enter では作らない
            if (event.nativeEvent.isComposing || event.key !== 'Enter') return
            // 止めないと、外側の form の送信（カードを保存して閉じる）になってしまう
            event.preventDefault()
            create()
          }}
          maxLength={LABEL_NAME_MAX}
          placeholder="新しいラベルの名前"
          aria-label="新しいラベルの名前"
          className="min-w-40 flex-1 bg-white"
        />
        <div role="radiogroup" aria-label="ラベルの色" className="flex gap-1.5">
          {LABEL_COLORS.map((value) => (
            <label key={value} className="cursor-pointer" title={labelColorStyles[value].name}>
              {/* ラジオボタンは見えなくして、隣の色の丸を選んだ状態の見た目にする */}
              <input
                type="radio"
                name={colorGroupName}
                value={value}
                checked={color === value}
                onChange={() => setColor(value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'block size-6 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-sky-500',
                  labelColorStyles[value].swatch,
                )}
              />
              <span className="sr-only">{labelColorStyles[value].name}</span>
            </label>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={create} disabled={!canCreate}>
          {isCreating ? '作成中…' : 'ラベルを作成'}
        </Button>
      </div>
    </fieldset>
  )
}
