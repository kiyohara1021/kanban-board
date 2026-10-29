import { AddItemForm } from '@/components/AddItemForm'
import type { ColumnWithCards } from '@/features/boards/types'
import { CARD_TITLE_MAX } from '@/features/boards/limits'
import { CardItem } from '@/features/cards/components/CardItem'
import { ColumnHeader } from './ColumnHeader'

type Props = {
  column: ColumnWithCards
  onRename: (title: string) => void
  onDelete: () => void
  onAddCard: (title: string) => void
  onOpenCard: (cardId: string) => void
}

export function BoardColumn({ column, onRename, onDelete, onAddCard, onOpenCard }: Props) {
  return (
    <section className="flex max-h-full w-72 shrink-0 snap-start flex-col gap-2 rounded-xl bg-slate-200/70 p-2">
      <ColumnHeader
        title={column.title}
        cardCount={column.cards.length}
        onRename={onRename}
        onDelete={onDelete}
      />

      {column.cards.length === 0 ? (
        <p className="px-2 py-2 text-center text-xs text-slate-400">カードはありません</p>
      ) : (
        <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {column.cards.map((card) => (
            <CardItem key={card.id} card={card} onOpen={() => onOpenCard(card.id)} />
          ))}
        </ul>
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
