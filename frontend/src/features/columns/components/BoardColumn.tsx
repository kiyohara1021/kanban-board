import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { CARD_TITLE_MAX, type Card, type ColumnWithCards, type Label } from '@kanban/shared'
import { AddItemForm } from '@/components/AddItemForm'
import type { DragData } from '@/features/boards/useBoardDnd'
import { CardItem, CardPreview } from '@/features/cards/components/CardItem'
import { labelsOfCard } from '@/features/labels/labelColors'
import { cn } from '@/lib/utils'
import { ColumnHeader } from './ColumnHeader'

type Props = {
  column: ColumnWithCards
  // 表示するカード。絞り込み中は条件に合うものだけ。column.cards には隠れているカードも入っている
  shownCards: Card[]
  // ボードのラベル一覧。カードには ID しかないので、ここから名前と色を引く
  labels: Label[]
  onRename: (title: string) => void
  onDelete: () => void
  onAddCard: (title: string) => void
  onOpenCard: (cardId: string) => void
}

const columnClassName = 'flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-slate-200/70 p-2'

export function BoardColumn({
  column,
  shownCards,
  labels,
  onRename,
  onDelete,
  onAddCard,
  onOpenCard,
}: Props) {
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
  const hiddenCount = column.cards.length - shownCards.length

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(columnClassName, 'max-h-full snap-start', isDragging && 'opacity-40')}
    >
      <ColumnHeader
        title={column.title}
        // 隠れているカードも含めた枚数。カラムを削除すると、隠れているカードも一緒に消えるため
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

      {/* id にカラムの ID を渡すと、カードの data.sortable.containerId からどのカラムか分かる。
          items は表示しているカードだけ。dnd-kit は items にある要素の間で並び替えを見せる */}
      <SortableContext
        id={column.id}
        items={shownCards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        {shownCards.length === 0 ? (
          <p className="px-2 py-2 text-center text-xs text-slate-400">
            {hiddenCount === 0 ? 'カードはありません' : '条件に合うカードはありません'}
          </p>
        ) : (
          <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
            {shownCards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                labels={labelsOfCard(labels, card)}
                onOpen={() => onOpenCard(card.id)}
              />
            ))}
          </ul>
        )}
      </SortableContext>
      {/* 絞り込み中に追加したカードが条件に合わないと、消えたように見える。隠している枚数を出しておく */}
      {hiddenCount > 0 && (
        <p className="px-2 text-xs text-slate-500">絞り込みで{hiddenCount}枚を隠しています</p>
      )}

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
export function ColumnPreview({
  column,
  shownCards,
  labels,
}: {
  column: ColumnWithCards
  shownCards: Card[]
  labels: Label[]
}) {
  return (
    <section
      className={cn(columnClassName, 'max-h-[70dvh] cursor-grabbing overflow-hidden shadow-lg')}
    >
      <h2 className="px-2 py-1 text-sm font-semibold text-slate-700">{column.title}</h2>
      <ul className="flex flex-col gap-2">
        {shownCards.map((card) => (
          <li key={card.id}>
            <CardPreview card={card} labels={labelsOfCard(labels, card)} className="shadow-sm" />
          </li>
        ))}
      </ul>
    </section>
  )
}
