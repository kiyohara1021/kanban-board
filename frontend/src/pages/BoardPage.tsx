import { DndContext, DragOverlay } from '@dnd-kit/core'
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { COLUMN_TITLE_MAX, type BoardDetail } from '@kanban/shared'
import { useState } from 'react'
import { AddItemForm } from '@/components/AddItemForm'
import { StatusMessage } from '@/components/StatusMessage'
import { findCard } from '@/features/boards/boardReducer'
import { BoardHeader } from '@/features/boards/components/BoardHeader'
import { useBoard } from '@/features/boards/queries'
import { useBoardAction } from '@/features/boards/useBoardAction'
import { useBoardDnd } from '@/features/boards/useBoardDnd'
import { CardDetailModal } from '@/features/cards/components/CardDetailModal'
import { CardPreview } from '@/features/cards/components/CardItem'
import { BoardColumn, ColumnPreview } from '@/features/columns/components/BoardColumn'

// 楽観的更新で画面に先に出すための仮の ID と日時。
// 保存に成功したあと、サーバーから取り直したデータ（本物の ID）に置き換わる
const newId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

export function BoardPage({ boardId }: { boardId: string }) {
  const query = useBoard(boardId)

  if (query.isPending) return <StatusMessage>読み込み中…</StatusMessage>
  if (query.isError) {
    return <StatusMessage error={query.error} onRetry={() => query.refetch()} />
  }
  return <BoardView board={query.data} />
}

// データの取得が終わってから描画する部分。
// フックは条件分岐より前に呼ぶ必要があるため、取得（BoardPage）と表示（BoardView）を分けている
function BoardView({ board }: { board: BoardDetail }) {
  // Step 2〜3 の dispatch と同じ形で呼べる。中で画面の更新と API の呼び出しをする
  const run = useBoardAction(board.id)
  // ドラッグ中は、カラムをまたいだ移動を反映した仮のボード（shownBoard）を表示する
  const { shownBoard, activeCard, activeColumn, contextProps } = useBoardDnd(board, run)
  // カードのコピーではなく ID だけを持ち、表示するカードは board から毎回探す。
  // こうすると、編集や削除の結果が自動で反映される
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const openCard = openCardId === null ? undefined : findCard(board, openCardId)

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <BoardHeader title={board.title} />
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
                onOpenCard={setOpenCardId}
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

      {openCard && (
        // key に card.id を渡すと、別のカードを開いたときにフォームの state が作り直される
        <CardDetailModal
          key={openCard.id}
          card={openCard}
          onSave={(changes) =>
            run({ type: 'updateCard', cardId: openCard.id, ...changes, now: now() })
          }
          onDelete={() => run({ type: 'deleteCard', cardId: openCard.id })}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </div>
  )
}
