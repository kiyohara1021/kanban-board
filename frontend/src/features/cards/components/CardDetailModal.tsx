import { useId, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LabelPicker } from '@/features/labels/components/LabelPicker'
import {
  CARD_DESCRIPTION_MAX,
  CARD_TITLE_MAX,
  type Card,
  type CreateLabelInput,
  // ui/label.tsx の Label（入力欄の見出しの部品）と名前がぶつかるので、別名で読み込む
  type Label as BoardLabel,
} from '@kanban/shared'

type Props = {
  card: Card
  // ボードのラベル一覧
  labels: BoardLabel[]
  onSave: (changes: {
    title: string
    description: string
    labelIds: string[]
    dueDate: string | null
  }) => void
  onDelete: () => void
  onClose: () => void
  onCreateLabel: (input: CreateLabelInput, onCreated: (label: BoardLabel) => void) => void
  isCreatingLabel: boolean
  onDeleteLabel: (labelId: string) => void
}

// 表示したいときだけ描画する（{openCard && <CardDetailModal />}）前提のモーダル
export function CardDetailModal({
  card,
  labels,
  onSave,
  onDelete,
  onClose,
  onCreateLabel,
  isCreatingLabel,
  onDeleteLabel,
}: Props) {
  // 入力中の値は、保存するまでボードに反映しないので、このコンポーネントの state に持つ
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const [labelIds, setLabelIds] = useState(card.labelIds)
  // <input type="date"> の値は "2026-11-05" の形の文字列で、未入力は空文字。API の null とは保存するときに変える
  const [dueDate, setDueDate] = useState(card.dueDate ?? '')
  const trimmedTitle = title.trim()
  // label と入力欄をつなぐ id。画面に同じ部品が複数あっても重ならない値を React が作る
  const titleId = useId()
  const descriptionId = useId()
  const dueDateId = useId()
  // 「期限日を消す」を押すとボタンが押せなくなるので、フォーカスを日付の入力欄に移す
  const dueDateRef = useRef<HTMLInputElement>(null)

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // Esc・背景クリック・右上の × で閉じられたとき
        if (!open) onClose()
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>カードの編集</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmedTitle === '') return
            onSave({
              title: trimmedTitle,
              description: description.trim(),
              // 編集中に削除されたラベルは送らない（サーバーにない ID を送ると 400 になる）
              labelIds: labelIds.filter((id) => labels.some((label) => label.id === id)),
              dueDate: dueDate === '' ? null : dueDate,
            })
            onClose()
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor={titleId}>タイトル</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={CARD_TITLE_MAX}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={descriptionId}>説明</Label>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={CARD_DESCRIPTION_MAX}
              rows={6}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={dueDateId}>期限日</Label>
            <div className="flex gap-2">
              <Input
                ref={dueDateRef}
                id={dueDateId}
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-auto"
              />
              <Button
                type="button"
                variant="outline"
                disabled={dueDate === ''}
                onClick={() => {
                  setDueDate('')
                  dueDateRef.current?.focus()
                }}
              >
                期限日を消す
              </Button>
            </div>
          </div>
          <LabelPicker
            labels={labels}
            selectedIds={labelIds}
            onToggle={(labelId) =>
              setLabelIds((ids) =>
                ids.includes(labelId) ? ids.filter((id) => id !== labelId) : [...ids, labelId],
              )
            }
            onCreate={onCreateLabel}
            isCreating={isCreatingLabel}
            onDelete={onDeleteLabel}
          />
          <DialogFooter className="sm:justify-between">
            <ConfirmDialog
              trigger={
                <Button type="button" variant="destructive">
                  削除
                </Button>
              }
              title={`「${card.title}」を削除しますか？`}
              description="この操作は取り消せません。"
              onConfirm={() => {
                onDelete()
                onClose()
              }}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={trimmedTitle === ''}>
                保存
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
