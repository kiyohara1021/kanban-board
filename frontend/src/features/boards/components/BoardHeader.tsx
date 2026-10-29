import { BOARD_TITLE_MAX } from '@kanban/shared'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import { InlineEdit } from '@/components/InlineEdit'

type Props = {
  title: string
  onRename: (title: string) => void
}

export function BoardHeader({ title, onRename }: Props) {
  return (
    <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
      <Link
        to="/"
        aria-label="ボード一覧に戻る"
        className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        <ChevronLeft className="size-5" />
      </Link>
      <InlineEdit
        value={title}
        onSave={onRename}
        maxLength={BOARD_TITLE_MAX}
        label="ボード名"
        heading="h1"
        textClassName="text-lg font-bold text-slate-800"
      />
    </header>
  )
}
