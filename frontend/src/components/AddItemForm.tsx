import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  label: string
  placeholder: string
  maxLength: number
  onAdd: (title: string) => void
}

// 「+ ○○を追加」ボタンを押すと入力欄に切り替わるフォーム。カードとカラムの追加で使う
export function AddItemForm({ label, placeholder, maxLength, onAdd }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')

  function close() {
    setIsOpen(false)
    setTitle('')
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        onClick={() => setIsOpen(true)}
        className="w-full justify-start text-slate-600 hover:bg-slate-300/60"
      >
        <Plus />
        {label}
      </Button>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const trimmed = title.trim()
        if (trimmed === '') return
        onAdd(trimmed)
        // 続けて追加できるよう、フォームは開いたまま入力欄だけ空にする
        setTitle('')
      }}
      className="flex flex-col gap-2"
    >
      <Input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close()
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-label={placeholder}
        className="bg-white"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={title.trim() === ''}>
          追加
        </Button>
        {/* shadcn の Button は type を指定しないと、form の中では送信ボタンになる */}
        <Button type="button" variant="ghost" onClick={close}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}
