import { useId, useState } from 'react'
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
import { CARD_DESCRIPTION_MAX, CARD_TITLE_MAX } from '@/features/boards/limits'
import type { Card } from '@/features/boards/types'

type Props = {
  card: Card
  onSave: (changes: { title: string; description: string }) => void
  onDelete: () => void
  onClose: () => void
}

// 表示したいときだけ描画する（{openCard && <CardDetailModal />}）前提のモーダル
export function CardDetailModal({ card, onSave, onDelete, onClose }: Props) {
  // 入力中の値は、保存するまでボードに反映しないので、このコンポーネントの state に持つ
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const trimmedTitle = title.trim()
  // label と入力欄をつなぐ id。画面に同じ部品が複数あっても重ならない値を React が作る
  const titleId = useId()
  const descriptionId = useId()

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
            onSave({ title: trimmedTitle, description: description.trim() })
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
