import { COLUMN_TITLE_MAX } from '@kanban/shared'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { InlineEdit } from '@/components/InlineEdit'
import { Button } from '@/components/ui/button'

type Props = {
  title: string
  cardCount: number
  onRename: (title: string) => void
  onDelete: () => void
  // カラムをドラッグする取っ手。ドラッグの仕組みは BoardColumn が持ち、ここでは置く場所だけ決める
  dragHandle: ReactNode
}

export function ColumnHeader({ title, cardCount, onRename, onDelete, dragHandle }: Props) {
  return (
    <div className="flex items-center gap-1">
      {dragHandle}
      <InlineEdit
        value={title}
        onSave={onRename}
        maxLength={COLUMN_TITLE_MAX}
        label="カラム名"
        heading="h2"
        textClassName="text-sm font-semibold text-slate-700"
      />
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
