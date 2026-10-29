import { BOARD_TITLE_MAX } from '@kanban/shared'
import { useNavigate } from 'react-router'
import { AddItemForm } from '@/components/AddItemForm'
import { StatusMessage } from '@/components/StatusMessage'
import { BoardTile } from '@/features/boards/components/BoardTile'
import { useBoards, useCreateBoard, useDeleteBoard } from '@/features/boards/queries'

// /（ボード一覧）
export function BoardListPage() {
  const boards = useBoards()
  const createBoard = useCreateBoard()
  const deleteBoard = useDeleteBoard()
  const navigate = useNavigate()

  if (boards.isPending) return <StatusMessage>読み込み中…</StatusMessage>
  if (boards.isError) {
    return <StatusMessage error={boards.error} onRetry={() => boards.refetch()} />
  }

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-slate-800">ボード一覧</h1>
      </header>
      <main className="mx-auto grid max-w-5xl gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards.data.length === 0 && (
          <p className="text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
            ボードがありません。最初のボードを作りましょう。
          </p>
        )}
        {boards.data.map((board) => (
          <BoardTile key={board.id} board={board} onDelete={() => deleteBoard.mutate(board.id)} />
        ))}
        <div className="self-start rounded-xl bg-slate-200/70 p-2">
          <AddItemForm
            label="ボードを作成"
            placeholder="ボード名"
            maxLength={BOARD_TITLE_MAX}
            // 作ったら、そのボードを開く
            onAdd={(title) =>
              createBoard.mutate(
                { title },
                { onSuccess: (board) => navigate(`/boards/${board.id}`) },
              )
            }
          />
        </div>
      </main>
    </div>
  )
}
