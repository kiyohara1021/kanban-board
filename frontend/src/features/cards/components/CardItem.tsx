import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '@kanban/shared'
import type { DragData } from '@/features/boards/useBoardDnd'
import { cn } from '@/lib/utils'

type Props = {
  card: Card
  onOpen: () => void
}

const cardClassName =
  'rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm select-none'

export function CardItem({ card, onOpen }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: 'card' } satisfies DragData })

  return (
    <li
      ref={setNodeRef}
      // ドラッグ中、ほかのカードが場所を空けるために動く量。dnd-kit が計算してくれる
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div
        // ドロップしたあと、dnd-kit はこの要素にフォーカスを戻す（キーボードで続けて操作できる）
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        onClick={onOpen}
        onKeyDown={(event) => {
          // dnd-kit のキー操作（Space で持ち上げる）も残しつつ、Enter でカードを開く
          listeners?.onKeyDown?.(event)
          if (event.key === 'Enter' && !isDragging) {
            // 既定の動作を止めないと、同じ Enter が開いたダイアログの入力欄に届き、
            // フォームの送信（保存して閉じる）として扱われてしまう
            event.preventDefault()
            onOpen()
          }
        }}
        aria-label={`カード「${card.title}」`}
        className={cn(
          cardClassName,
          'cursor-grab hover:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:outline-none',
          // 元の場所には薄い影を残し、指やマウスに付いていく方は DragOverlay で表示する
          isDragging && 'opacity-40',
        )}
      >
        <CardContent card={card} />
      </div>
    </li>
  )
}

// ドラッグ中に指やマウスに付いていく表示（DragOverlay の中で使う）
export function CardPreview({ card, className }: { card: Card; className?: string }) {
  return (
    <div className={cn(cardClassName, 'cursor-grabbing shadow-lg', className)}>
      <CardContent card={card} />
    </div>
  )
}

function CardContent({ card }: { card: Card }) {
  return (
    <>
      <p className="text-sm font-medium text-slate-800">{card.title}</p>
      {card.description !== '' && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.description}</p>
      )}
    </>
  )
}
