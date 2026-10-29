import type { Card } from '@/features/boards/types'

type Props = {
  card: Card
  onOpen: () => void
}

export function CardItem({ card, onOpen }: Props) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-sky-300"
      >
        <p className="text-sm font-medium text-slate-800">{card.title}</p>
        {card.description !== '' && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.description}</p>
        )}
      </button>
    </li>
  )
}
