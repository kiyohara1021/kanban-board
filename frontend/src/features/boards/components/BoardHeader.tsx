type Props = {
  title: string
}

export function BoardHeader({ title }: Props) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3">
      <h1 className="text-lg font-bold text-slate-800">{title}</h1>
    </header>
  )
}
