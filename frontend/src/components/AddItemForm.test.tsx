import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddItemForm } from './AddItemForm'

function setup() {
  const onAdd = vi.fn()
  const user = userEvent.setup()
  render(
    <AddItemForm
      label="カードを追加"
      placeholder="カードのタイトル"
      maxLength={100}
      onAdd={onAdd}
    />,
  )
  return { onAdd, user }
}

describe('AddItemForm', () => {
  it('追加すると入力欄だけ空になり、続けて追加できる', async () => {
    const { onAdd, user } = setup()

    await user.click(screen.getByRole('button', { name: 'カードを追加' }))
    const input = screen.getByRole('textbox', { name: 'カードのタイトル' })
    await user.type(input, '  1枚目  {Enter}')
    await user.type(input, '2枚目{Enter}')

    expect(onAdd.mock.calls).toEqual([['1枚目'], ['2枚目']])
    expect(input).toHaveValue('')
  })

  it('空のときは「追加」ボタンを押せない', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'カードを追加' }))

    expect(screen.getByRole('button', { name: '追加' })).toBeDisabled()
  })

  it('Esc で閉じる', async () => {
    const { onAdd, user } = setup()

    await user.click(screen.getByRole('button', { name: 'カードを追加' }))
    await user.type(screen.getByRole('textbox'), '書きかけ{Escape}')

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })
})
