import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InlineEdit } from './InlineEdit'

function setup() {
  const onSave = vi.fn()
  const user = userEvent.setup()
  render(<InlineEdit value="ToDo" onSave={onSave} maxLength={50} label="カラム名" heading="h2" />)
  return { onSave, user }
}

// React Testing Library では、画面に見えている文字や役割（role）で要素を探す。
// 利用者と同じ見え方でテストするため、クラス名や内部の構造には頼らない
describe('InlineEdit', () => {
  it('クリックすると入力欄になり、Enter で前後の空白を除いて保存する', async () => {
    const { onSave, user } = setup()

    await user.click(screen.getByRole('button', { name: 'ToDo' }))
    const input = screen.getByRole('textbox', { name: 'カラム名' })
    expect(input).toHaveFocus()

    await user.clear(input)
    await user.type(input, '  やること  {Enter}')

    expect(onSave).toHaveBeenCalledWith('やること')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('Esc で取り消すと保存しない', async () => {
    const { onSave, user } = setup()

    await user.click(screen.getByRole('button', { name: 'ToDo' }))
    await user.type(screen.getByRole('textbox'), '変更{Escape}')

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'ToDo' })).toBeInTheDocument()
  })

  it('空にしたときや、名前が変わっていないときは保存しない', async () => {
    const { onSave, user } = setup()

    await user.click(screen.getByRole('button', { name: 'ToDo' }))
    await user.clear(screen.getByRole('textbox'))
    await user.keyboard('{Enter}')

    await user.click(screen.getByRole('button', { name: 'ToDo' }))
    await user.keyboard('{Enter}')

    expect(onSave).not.toHaveBeenCalled()
  })

  it('日本語入力の変換を確定する Enter では、編集を終えない', async () => {
    const { onSave, user } = setup()

    await user.click(screen.getByRole('button', { name: 'ToDo' }))
    const input = screen.getByRole('textbox')
    // isComposing: true は「変換中」の Enter。userEvent では再現できないので fireEvent で送る
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})
