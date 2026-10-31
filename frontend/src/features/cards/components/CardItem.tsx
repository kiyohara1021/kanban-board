import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { isOverdue, type Card, type Label } from '@kanban/shared'
import { CalendarDays, CircleAlert } from 'lucide-react'
import type { DragData } from '@/features/boards/useBoardDnd'
import { LabelChip } from '@/features/labels/components/LabelChip'
import { cn } from '@/lib/utils'
import { formatDueDate } from '../dueDate'
import { useToday } from '../useToday'

type Props = {
  card: Card
  // このカードに付いているラベル
  labels: Label[]
  onOpen: () => void
}

const cardClassName =
  'rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm select-none'
// 期限切れのカードは枠も赤くする。色だけに頼らないよう、中にも「期限切れ」の文字を出す（DueDate）
const overdueClassName = 'border-red-300'

export function CardItem({ card, labels, onOpen }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: 'card' } satisfies DragData })
  const today = useToday()

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
        // aria-label は中の文字より優先して読まれるので、ラベルの名前と期限日もここに入れる
        aria-label={cardName(card, labels, today)}
        className={cn(
          cardClassName,
          isOverdue(card.dueDate, today) && overdueClassName,
          'cursor-grab hover:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:outline-none',
          // 元の場所には薄い影を残し、指やマウスに付いていく方は DragOverlay で表示する
          isDragging && 'opacity-40',
        )}
      >
        <CardContent card={card} labels={labels} today={today} />
      </div>
    </li>
  )
}

// ドラッグ中に指やマウスに付いていく表示（DragOverlay の中で使う）
export function CardPreview({
  card,
  labels,
  className,
}: {
  card: Card
  labels: Label[]
  className?: string
}) {
  const today = useToday()
  return (
    <div
      className={cn(
        cardClassName,
        isOverdue(card.dueDate, today) && overdueClassName,
        'cursor-grabbing shadow-lg',
        className,
      )}
    >
      <CardContent card={card} labels={labels} today={today} />
    </div>
  )
}

// 読み上げ用のカードの名前。
// 例：カード「API を作る」（ラベル：急ぎ、バックエンド）（期限：11月5日、期限切れ）
function cardName(card: Card, labels: Label[], today: string) {
  let name = `カード「${card.title}」`
  if (labels.length > 0) name += `（ラベル：${labels.map((label) => label.name).join('、')}）`
  if (card.dueDate !== null) {
    const overdue = isOverdue(card.dueDate, today) ? '、期限切れ' : ''
    name += `（期限：${formatDueDate(card.dueDate, today)}${overdue}）`
  }
  return name
}

function CardContent({ card, labels, today }: { card: Card; labels: Label[]; today: string }) {
  return (
    <>
      {labels.length > 0 && (
        <ul className="mb-1.5 flex flex-wrap gap-1">
          {labels.map((label) => (
            <li key={label.id} className="max-w-full">
              <LabelChip label={label} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm font-medium text-slate-800">{card.title}</p>
      {card.description !== '' && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.description}</p>
      )}
      {card.dueDate !== null && <DueDate dueDate={card.dueDate} today={today} />}
    </>
  )
}

// 期限日の表示。期限切れのときは、赤い色に加えてアイコンと「期限切れ」の文字を出す
function DueDate({ dueDate, today }: { dueDate: string; today: string }) {
  const overdue = isOverdue(dueDate, today)
  const Icon = overdue ? CircleAlert : CalendarDays
  return (
    <p
      className={cn(
        'mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs',
        overdue ? 'bg-red-50 font-medium text-red-700' : 'text-slate-500',
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {/* time 要素の dateTime に機械が読める形の日付を入れておく */}
      <time dateTime={dueDate}>{formatDueDate(dueDate, today)}</time>
      {overdue && <span>期限切れ</span>}
    </p>
  )
}
