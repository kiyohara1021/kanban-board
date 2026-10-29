import type { Board } from '@kanban/shared'
import { X } from 'lucide-react'
import { Link } from 'react-router'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'

type Props = {
  board: Board
  onDelete: () => void
}

// ボード一覧の1件。クリックでボードを開き、右上の × で削除する
export function BoardTile({ board, onDelete }: Props) {
  return (
    // リンクの中にボタンは置けないので、2つを重ねて並べる
    <div className="relative">
      <Link
        to={`/boards/${board.id}`}
        className="block h-24 rounded-xl border border-slate-200 bg-white p-4 pr-10 shadow-sm hover:border-sky-300"
      >
        <h2 className="line-clamp-2 font-semibold text-slate-800">{board.title}</h2>
        <p className="mt-1 text-xs text-slate-500">
          作成日：{new Date(board.createdAt).toLocaleDateString('ja-JP')}
        </p>
      </Link>
      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`「${board.title}」を削除`}
            className="absolute top-2 right-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <X />
          </Button>
        }
        title={`「${board.title}」を削除しますか？`}
        description="中のカラムとカードもすべて削除されます。この操作は取り消せません。"
        onConfirm={onDelete}
      />
    </div>
  )
}
