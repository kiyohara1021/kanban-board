import { DndContext, DragOverlay } from '@dnd-kit/core'
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { COLUMN_TITLE_MAX, type BoardDetail, type ColumnWithCards } from '@kanban/shared'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { AddItemForm } from '@/components/AddItemForm'
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary'
import { StatusMessage } from '@/components/StatusMessage'
import { newId, now } from '@/features/boards/actionValues'
import type { BoardAction } from '@/features/boards/boardReducer'
import { BoardHeader } from '@/features/boards/components/BoardHeader'
import { useBoard, useUpdateBoard } from '@/features/boards/queries'
import { useBoardAction } from '@/features/boards/useBoardAction'
import { useBoardDnd } from '@/features/boards/useBoardDnd'
import { isFiltering, matchesCardFilter, type CardFilter } from '@/features/cards/cardFilter'
import { CardFilterBar } from '@/features/cards/components/CardFilterBar'
import { CardPreview } from '@/features/cards/components/CardItem'
import { useCardFilter } from '@/features/cards/useCardFilter'
import { BoardColumn, ColumnPreview } from '@/features/columns/components/BoardColumn'
import { labelsOfCard } from '@/features/labels/labelColors'
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
  // 絞り込みの条件は URL のクエリ（?q=…&label=…）に持つ
  const { filter, setFilter } = useCardFilter(board.labels)
  const matchCount = board.columns
    .flatMap((column) => column.cards)
    .filter((card) => matchesCardFilter(card, filter)).length

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <BoardHeader title={board.title} onRename={(title) => updateBoard.mutate({ title })} />
      <CardFilterBar
        filter={filter}
        labels={board.labels}
        matchCount={matchCount}
        onChange={setFilter}
      />
      {/* カラムとカードの表示で描画中のエラーが起きても、ヘッダー（一覧に戻るリンク）は残す。
          エラーバウンダリーは、自分より内側で起きたエラーだけを受け止める */}
      <SectionErrorBoundary resetKeys={[board]}>
        <BoardColumns board={board} filter={filter} run={run} />
      </SectionErrorBoundary>

      {/* 子ルート（/boards/:boardId/cards/:cardId のカード詳細）がここに表示される */}
      <Outlet context={{ board, run } satisfies BoardOutletContext} />
    </div>
  )
}

type BoardColumnsProps = {
  board: BoardDetail
  filter: CardFilter
  run: (action: BoardAction) => void
}

// カラムとカードの並び。ドラッグ&ドロップもここで扱う
function BoardColumns({ board, filter, run }: BoardColumnsProps) {
  // ドラッグ中は、カラムをまたいだ移動を反映した仮のボード（shownBoard）を表示する。
  // useBoardDnd には絞り込む前のボードを渡し、絞り込みは表示するときだけ行う。
  // 並び順の計算に、隠れているカードも含めた並びが要るため（docs/04-frontend.md）
  const { shownBoard, activeCard, activeColumn, contextProps } = useBoardDnd(board, run)
  const navigate = useNavigate()
  // カード詳細を開くときも、絞り込みの条件（?q=…）を URL に残す
  const { search } = useLocation()
  const filtering = isFiltering(filter)
  const shownCardsOf = (column: ColumnWithCards) =>
    filtering ? column.cards.filter((card) => matchesCardFilter(card, filter)) : column.cards

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
              shownCards={shownCardsOf(column)}
              labels={shownBoard.labels}
              onRename={(title) =>
                run({ type: 'renameColumn', columnId: column.id, title, now: now() })
              }
              onDelete={() => run({ type: 'deleteColumn', columnId: column.id })}
              onAddCard={(title) =>
                run({ type: 'addCard', id: newId(), columnId: column.id, title, now: now() })
              }
              // 開いているカードは URL で表す。リロードしても開いたままになり、URL を共有できる
              onOpenCard={(cardId) =>
                navigate({ pathname: `/boards/${board.id}/cards/${cardId}`, search })
              }
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
        {activeCard && (
          <CardPreview
            card={activeCard}
            labels={labelsOfCard(shownBoard.labels, activeCard)}
            className="rotate-2"
          />
        )}
        {activeColumn && (
          <ColumnPreview
            column={activeColumn}
            shownCards={shownCardsOf(activeColumn)}
            labels={shownBoard.labels}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
