import type { Label } from '@kanban/shared'
import { cn } from '@/lib/utils'
import { labelColorStyles } from '../labelColors'

// ラベルの表示。色の点と名前を並べ、色が見分けにくくても名前で区別できるようにする
export function LabelChip({ label, className }: { label: Label; className?: string }) {
  const style = labelColorStyles[label.color]
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        style.chip,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', style.swatch)} />
      <span className="truncate">{label.name}</span>
    </span>
  )
}
