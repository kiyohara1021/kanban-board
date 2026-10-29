import { useReducer, useState } from 'react'
import { AddItemForm } from '@/components/AddItemForm'
import { boardReducer, findCard } from '@/features/boards/boardReducer'
import { BoardHeader } from '@/features/boards/components/BoardHeader'
import { COLUMN_TITLE_MAX } from '@/features/boards/limits'
import { mockBoard } from '@/features/boards/mockBoard'
import { CardDetailModal } from '@/features/cards/components/CardDetailModal'
import { BoardColumn } from '@/features/columns/components/BoardColumn'

// ID と日時はイベントハンドラーで作り、アクションに入れて reducer に渡す
const newId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

export function BoardPage() {
  const [board, dispatch] = useReducer(boardReducer, mockBoard)
  // カードのコピーではなく ID だけを持ち、表示するカードは board から毎回探す。
  // こうすると、編集や削除の結果が自動で反映される
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const openCard = openCardId === null ? undefined : findCard(board, openCardId)

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <BoardHeader title={board.title} />
      <main className="flex min-h-0 flex-1 snap-x scroll-px-4 items-start gap-3 overflow-x-auto p-4">
        {board.columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            onRename={(title) =>
              dispatch({ type: 'renameColumn', columnId: column.id, title, now: now() })
            }
            onDelete={() => dispatch({ type: 'deleteColumn', columnId: column.id })}
            onAddCard={(title) =>
              dispatch({ type: 'addCard', id: newId(), columnId: column.id, title, now: now() })
            }
            onOpenCard={setOpenCardId}
          />
        ))}
        <div className="w-72 shrink-0 snap-start rounded-xl bg-slate-200/40 p-2">
          <AddItemForm
            label="カラムを追加"
            placeholder="カラム名"
            maxLength={COLUMN_TITLE_MAX}
            onAdd={(title) => dispatch({ type: 'addColumn', id: newId(), title, now: now() })}
          />
        </div>
      </main>

      {openCard && (
        // key に card.id を渡すと、別のカードを開いたときにフォームの state が作り直される
        <CardDetailModal
          key={openCard.id}
          card={openCard}
          onSave={(changes) =>
            dispatch({ type: 'updateCard', cardId: openCard.id, ...changes, now: now() })
          }
          onDelete={() => dispatch({ type: 'deleteCard', cardId: openCard.id })}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </div>
  )
}
