import { DndContext, DragOverlay } from '@dnd-kit/core'
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { COLUMN_TITLE_MAX, type BoardDetail } from '@kanban/shared'
import { Link, Outlet, useNavigate, useParams } from 'react-router'
import { AddItemForm } from '@/components/AddItemForm'
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary'
import { StatusMessage } from '@/components/StatusMessage'
import { newId, now } from '@/features/boards/actionValues'
import type { BoardAction } from '@/features/boards/boardReducer'
import { BoardHeader } from '@/features/boards/components/BoardHeader'
import { useBoard, useUpdateBoard } from '@/features/boards/queries'
import { useBoardAction } from '@/features/boards/useBoardAction'
import { useBoardDnd } from '@/features/boards/useBoardDnd'
import { CardPreview } from '@/features/cards/components/CardItem'
import { BoardColumn, ColumnPreview } from '@/features/columns/components/BoardColumn'
import { ApiError } from '@/lib/apiClient'

// 子ルート（カード詳細）に渡す値。子では useOutletContext で受け取る
export type BoardOutletContext = {
  board: BoardDetail
  run: (action: BoardAction) => void
}

// /boards/:boardId（ボード）
export function BoardPage() {
  const { boardId = '' } = useParams()
  const query = useBoard(boardId)

  if (query.isPending) return <StatusMessage>読み込み中…</StatusMessage>
  if (query.isError) {
    // 存在しないボードは、再読み込みしても見つからないので一覧に戻す
    const notFound = query.error instanceof ApiError && query.error.status === 404
    return (
      <StatusMessage error={query.error} onRetry={notFound ? undefined : () => query.refetch()}>
        <Link to="/" className="text-sky-700 underline">
          ボード一覧に戻る
        </Link>
      </StatusMessage>
    )
  }
  return <BoardView board={query.data} />
}

// データの取得が終わってから描画する部分。
// フックは条件分岐より前に呼ぶ必要があるため、取得（BoardPage）と表示（BoardView）を分けている
function BoardView({ board }: { board: BoardDetail }) {
  // Step 2〜3 の dispatch と同じ形で呼べる。中で画面の更新と API の呼び出しをする
  const run = useBoardAction(board.id)
  const updateBoard = useUpdateBoard(board.id)

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <BoardHeader title={board.title} onRename={(title) => updateBoard.mutate({ title })} />
      {/* カラムとカードの表示で描画中のエラーが起きても、ヘッダー（一覧に戻るリンク）は残す。
          エラーバウンダリーは、自分より内側で起きたエラーだけを受け止める */}
      <SectionErrorBoundary resetKeys={[board]}>
        <BoardColumns board={board} run={run} />
      </SectionErrorBoundary>

      {/* 子ルート（/boards/:boardId/cards/:cardId のカード詳細）がここに表示される */}
      <Outlet context={{ board, run } satisfies BoardOutletContext} />
    </div>
  )
}

// カラムとカードの並び。ドラッグ&ドロップもここで扱う
function BoardColumns({ board, run }: { board: BoardDetail; run: (action: BoardAction) => void }) {
  // ドラッグ中は、カラムをまたいだ移動を反映した仮のボード（shownBoard）を表示する
  const { shownBoard, activeCard, activeColumn, contextProps } = useBoardDnd(board, run)
  const navigate = useNavigate()

  return (
    <DndContext {...contextProps}>
      <main className="flex min-h-0 flex-1 snap-x scroll-px-4 items-start gap-3 overflow-x-auto p-4">
        <SortableContext
          items={shownBoard.columns.map((column) => column.id)}
          strategy={horizontalListSortingStrategy}
        >
          {shownBoard.columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              onRename={(title) =>
                run({ type: 'renameColumn', columnId: column.id, title, now: now() })
              }
              onDelete={() => run({ type: 'deleteColumn', columnId: column.id })}
              onAddCard={(title) =>
                run({ type: 'addCard', id: newId(), columnId: column.id, title, now: now() })
              }
              // 開いているカードは URL で表す。リロードしても開いたままになり、URL を共有できる
              onOpenCard={(cardId) => navigate(`/boards/${board.id}/cards/${cardId}`)}
            />
          ))}
        </SortableContext>
        <div className="w-72 shrink-0 snap-start rounded-xl bg-slate-200/40 p-2">
          <AddItemForm
            label="カラムを追加"
            placeholder="カラム名"
            maxLength={COLUMN_TITLE_MAX}
            onAdd={(title) => run({ type: 'addColumn', id: newId(), title, now: now() })}
          />
        </div>
      </main>

      {/* ドラッグ中、マウスや指に付いていく表示。元の要素とは別に、画面の一番上に描画される */}
      <DragOverlay>
        {activeCard && <CardPreview card={activeCard} className="rotate-2" />}
        {activeColumn && <ColumnPreview column={activeColumn} />}
      </DragOverlay>
    </DndContext>
  )
}
