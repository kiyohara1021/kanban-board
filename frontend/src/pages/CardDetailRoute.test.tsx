import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadDb } from '@/demo/db'
import { renderApp, saveSampleBoard } from '@/test/renderApp'

// カード詳細の URL を直接開き、ダイアログが出るまで待つ
async function openCard() {
  saveSampleBoard()
  const user = userEvent.setup()
  const router = renderApp('/boards/b1/cards/k1')
  await screen.findByRole('dialog', { name: 'カードの編集' })
  return { user, router }
}

describe('カード詳細', () => {
  it('タイトルと説明を変えて保存すると、閉じてボードに反映される', async () => {
    const { user, router } = await openCard()

    const title = screen.getByRole('textbox', { name: 'タイトル' })
    await user.clear(title)
    await user.type(title, 'テストを増やす')
    const description = screen.getByRole('textbox', { name: '説明' })
    await user.clear(description)
    await user.type(description, '  画面のテストを足す  ')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/boards/b1')
    expect(screen.getByRole('button', { name: 'カード「テストを増やす」' })).toBeInTheDocument()
    // 前後の空白は除いて保存する
    await waitFor(() =>
      expect(loadDb().cards[0]).toMatchObject({
        title: 'テストを増やす',
        description: '画面のテストを足す',
      }),
    )
  })

  it('タイトルが空のときは保存できない', async () => {
    const { user } = await openCard()

    await user.clear(screen.getByRole('textbox', { name: 'タイトル' }))

    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
  })

  it('キャンセルすると、変えた内容を保存せずに閉じる', async () => {
    const { user, router } = await openCard()

    await user.type(screen.getByRole('textbox', { name: 'タイトル' }), '（書きかけ）')
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/boards/b1')
    expect(screen.getByRole('button', { name: 'カード「テストを書く」' })).toBeInTheDocument()
    expect(loadDb().cards[0]?.title).toBe('テストを書く')
  })

  it('削除すると、確認したあとで閉じてボードから消える', async () => {
    const { user, router } = await openCard()

    await user.click(screen.getByRole('button', { name: '削除' }))
    const confirm = screen.getByRole('alertdialog', { name: '「テストを書く」を削除しますか？' })
    await user.click(within(confirm).getByRole('button', { name: '削除' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/boards/b1'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'カード「テストを書く」' })).not.toBeInTheDocument()
    await waitFor(() => expect(loadDb().cards).toEqual([]))
  })
})
