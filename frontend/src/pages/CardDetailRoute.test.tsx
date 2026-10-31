import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadDb, saveDb } from '@/demo/db'
import { renderApp, saveSampleBoard, setToday } from '@/test/renderApp'

// カード詳細の URL を直接開き、ダイアログが出るまで待つ。
// withLabel を true にすると、カードにラベル「急ぎ」を付けた状態から始める。
// dueDate を渡すと、カードにその期限日を付けた状態から始める
async function openCard({ withLabel = false, dueDate = null as string | null } = {}) {
  saveSampleBoard()
  if (withLabel) saveDb({ ...loadDb(), cardLabels: [{ cardId: 'k1', labelId: 'l1' }] })
  if (dueDate !== null) {
    const db = loadDb()
    saveDb({ ...db, cards: db.cards.map((card) => ({ ...card, dueDate })) })
  }
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

describe('カード詳細のラベル', () => {
  it('ラベルを選んで保存すると、カードに表示される', async () => {
    const { user } = await openCard()

    const checkbox = screen.getByRole('checkbox', { name: '急ぎ' })
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: '保存' }))

    // カードの読み上げ名に、付いているラベルの名前も入る
    expect(
      screen.getByRole('button', { name: 'カード「テストを書く」（ラベル：急ぎ）' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(loadDb().cardLabels).toEqual([{ cardId: 'k1', labelId: 'l1' }]))
  })

  it('チェックを外して保存すると、カードから外れる', async () => {
    const { user } = await openCard({ withLabel: true })

    const checkbox = screen.getByRole('checkbox', { name: '急ぎ' })
    expect(checkbox).toBeChecked()
    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByRole('button', { name: 'カード「テストを書く」' })).toBeInTheDocument()
    await waitFor(() => expect(loadDb().cardLabels).toEqual([]))
  })

  it('ラベルを作ると、このカードに付けた状態で一覧に加わる', async () => {
    const { user } = await openCard()

    await user.type(screen.getByRole('textbox', { name: '新しいラベルの名前' }), '学習')
    await user.click(screen.getByRole('radio', { name: '青' }))
    await user.click(screen.getByRole('button', { name: 'ラベルを作成' }))

    // サーバーが決めた ID が届いてから一覧に出る（楽観的更新はしない）
    const checkbox = await screen.findByRole('checkbox', { name: '学習' })
    // 一覧に出たあと（mutate に渡した onSuccess で）チェックが入る
    await waitFor(() => expect(checkbox).toBeChecked())
    expect(screen.getByRole('textbox', { name: '新しいラベルの名前' })).toHaveValue('')
    const created = loadDb().labels.find((label) => label.name === '学習')
    expect(created).toMatchObject({ boardId: 'b1', color: 'blue' })

    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(loadDb().cardLabels).toEqual([{ cardId: 'k1', labelId: created?.id }]),
    )
  })

  it('ラベルの名前で Enter を押すと、カードを保存せずにラベルだけ作る', async () => {
    const { user } = await openCard()

    await user.type(screen.getByRole('textbox', { name: '新しいラベルの名前' }), '学習{Enter}')

    expect(await screen.findByRole('checkbox', { name: '学習' })).toBeInTheDocument()
    // 外側の form が送信されていない（ダイアログが開いたまま）
    expect(screen.getByRole('dialog', { name: 'カードの編集' })).toBeInTheDocument()
  })

  it('ラベルを削除すると、確認したあとで一覧と付けていたカードから消える', async () => {
    const { user } = await openCard({ withLabel: true })

    await user.click(screen.getByRole('button', { name: 'ラベル「急ぎ」を削除' }))
    const confirm = screen.getByRole('alertdialog', { name: 'ラベル「急ぎ」を削除しますか？' })
    await user.click(within(confirm).getByRole('button', { name: '削除' }))

    expect(screen.queryByRole('checkbox', { name: '急ぎ' })).not.toBeInTheDocument()
    expect(screen.getByText('ラベルはまだありません')).toBeInTheDocument()
    // カードの保存を待たずに、すぐ削除される
    await waitFor(() => expect(loadDb().labels).toEqual([]))
    expect(loadDb().cardLabels).toEqual([])
  })
})

describe('カード詳細の期限日', () => {
  it('期限日を入れて保存すると、カードに表示され、日付の文字列で保存される', async () => {
    setToday(2026, 11, 5)
    const { user } = await openCard()

    const input = screen.getByLabelText('期限日')
    expect(input).toHaveValue('')
    expect(screen.getByRole('button', { name: '期限日を消す' })).toBeDisabled()
    await user.type(input, '2026-11-20')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(
      screen.getByRole('button', { name: 'カード「テストを書く」（期限：11月20日）' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(loadDb().cards[0]?.dueDate).toBe('2026-11-20'))
  })

  it('「期限日を消す」を押して保存すると、期限日がなくなる', async () => {
    setToday(2026, 11, 5)
    const { user } = await openCard({ dueDate: '2026-11-20' })

    const input = screen.getByLabelText('期限日')
    expect(input).toHaveValue('2026-11-20')
    await user.click(screen.getByRole('button', { name: '期限日を消す' }))
    // ボタンが押せなくなるので、フォーカスは日付の入力欄に移る
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByRole('button', { name: 'カード「テストを書く」' })).toBeInTheDocument()
    await waitFor(() => expect(loadDb().cards[0]?.dueDate).toBeNull())
  })

  it('年が5桁以上の日付は、ブラウザが保存の前に止める', async () => {
    const { user } = await openCard()

    // Chrome では、年の欄に数字を続けて打つと6桁の年になることがある
    const input = screen.getByLabelText('期限日')
    await user.type(input, '202610-10-20')
    expect(input).toBeInvalid()
    await user.click(screen.getByRole('button', { name: '保存' }))

    // form が送信されないので、ダイアログは開いたままで、何も保存しない
    expect(screen.getByRole('dialog', { name: 'カードの編集' })).toBeInTheDocument()
    expect(loadDb().cards[0]?.dueDate).toBeNull()
  })
})
