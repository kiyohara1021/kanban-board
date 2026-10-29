import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { CARD_TITLE_MAX, type ColumnWithCards } from '@kanban/shared'
import { AddItemForm } from '@/components/AddItemForm'
import type { DragData } from '@/features/boards/useBoardDnd'
import { CardItem, CardPreview } from '@/features/cards/components/CardItem'
import { cn } from '@/lib/utils'
import { ColumnHeader } from './ColumnHeader'

type Props = {
  column: ColumnWithCards
  onRename: (title: string) => void
  onDelete: () => void
  onAddCard: (title: string) => void
  onOpenCard: (cardId: string) => void
}

const columnClassName = 'flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-slate-200/70 p-2'

export function BoardColumn({ column, onRename, onDelete, onAddCard, onOpenCard }: Props) {
  // カラム自体も並び替えられる。カードを空のカラムに落とすときの受け皿にもなる
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, data: { type: 'column' } satisfies DragData })

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(columnClassName, 'max-h-full snap-start', isDragging && 'opacity-40')}
    >
      <ColumnHeader
        title={column.title}
        cardCount={column.cards.length}
        onRename={onRename}
        onDelete={onDelete}
        dragHandle={
          // カラムはこの取っ手だけでドラッグする（タイトルのクリックは名前の変更に使うため）
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`カラム「${column.title}」を移動`}
            className="shrink-0 cursor-grab rounded p-0.5 text-slate-400 hover:bg-slate-300/60 hover:text-slate-600"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />

      {/* id にカラムの ID を渡すと、カードの data.sortable.containerId からどのカラムか分かる */}
      <SortableContext
        id={column.id}
        items={column.cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        {column.cards.length === 0 ? (
          <p className="px-2 py-2 text-center text-xs text-slate-400">カードはありません</p>
        ) : (
          <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
            {column.cards.map((card) => (
              <CardItem key={card.id} card={card} onOpen={() => onOpenCard(card.id)} />
            ))}
          </ul>
        )}
      </SortableContext>

      <AddItemForm
        label="カードを追加"
        placeholder="カードのタイトル"
        maxLength={CARD_TITLE_MAX}
        onAdd={onAddCard}
      />
    </section>
  )
}

// カラムをドラッグしている間、マウスに付いていく表示（DragOverlay の中で使う）
export function ColumnPreview({ column }: { column: ColumnWithCards }) {
  return (
    <section
      className={cn(columnClassName, 'max-h-[70dvh] cursor-grabbing overflow-hidden shadow-lg')}
    >
      <h2 className="px-2 py-1 text-sm font-semibold text-slate-700">{column.title}</h2>
      <ul className="flex flex-col gap-2">
        {column.cards.map((card) => (
          <li key={card.id}>
            <CardPreview card={card} className="shadow-sm" />
          </li>
        ))}
      </ul>
    </section>
  )
}
