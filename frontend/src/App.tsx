import { BOARD_TITLE_MAX } from '@kanban/shared'
import { AddItemForm } from '@/components/AddItemForm'
import { StatusMessage } from '@/components/StatusMessage'
import { useBoards, useCreateBoard } from '@/features/boards/queries'
import { BoardPage } from '@/pages/BoardPage'

// Step 6 で React Router を入れるまでは、最初のボードを表示する
function App() {
  const boards = useBoards()
  const createBoard = useCreateBoard()

  if (boards.isPending) return <StatusMessage>読み込み中…</StatusMessage>
  if (boards.isError) {
    return <StatusMessage error={boards.error} onRetry={() => boards.refetch()} />
  }

  const firstBoard = boards.data[0]
  if (!firstBoard) {
    return (
      <StatusMessage>
        <p>ボードがありません。最初のボードを作りましょう。</p>
        <div className="w-72 rounded-xl bg-slate-200/70 p-2 text-left">
          <AddItemForm
            label="ボードを作成"
            placeholder="ボード名"
            maxLength={BOARD_TITLE_MAX}
            onAdd={(title) => createBoard.mutate({ title })}
          />
        </div>
      </StatusMessage>
    )
  }

  return <BoardPage boardId={firstBoard.id} />
}

export default App
