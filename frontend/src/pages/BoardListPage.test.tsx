import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadDb } from '@/demo/db'
import { renderApp, saveSampleBoard } from '@/test/renderApp'

describe('ボード一覧', () => {
  it('ボードがないときは、作成をうながすメッセージを出す', async () => {
    renderApp('/')

    expect(
      await screen.findByText('ボードがありません。最初のボードを作りましょう。'),
    ).toBeInTheDocument()
  })

  it('削除すると、確認したあとで一覧から消える', async () => {
    saveSampleBoard()
    const user = userEvent.setup()
    renderApp('/')

    await user.click(await screen.findByRole('button', { name: '「マイボード」を削除' }))
    // 取り消せない操作なので、すぐには消さずに確認する
    const dialog = screen.getByRole('alertdialog', { name: '「マイボード」を削除しますか？' })
    await user.click(within(dialog).getByRole('button', { name: '削除' }))

    expect(
      await screen.findByText('ボードがありません。最初のボードを作りましょう。'),
    ).toBeInTheDocument()
    // ボードの中のカラムとカードも消える
    expect(loadDb()).toEqual({ boards: [], columns: [], cards: [] })
  })

  it('削除の確認でキャンセルすると、何も消さない', async () => {
    saveSampleBoard()
    const user = userEvent.setup()
    renderApp('/')

    await user.click(await screen.findByRole('button', { name: '「マイボード」を削除' }))
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'マイボード' })).toBeInTheDocument()
    expect(loadDb().boards).toHaveLength(1)
  })
})
