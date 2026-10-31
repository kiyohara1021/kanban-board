import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { emptyDb, saveDb } from '@/demo/db'
import { board, card, column, label, renderApp } from '@/test/renderApp'

// 絞り込みを試すためのボード。
// ToDo：「テストを書く」（急ぎ。説明に React）と「API を作る」（ラベルなし）
// 完了：「画面を作る」（画面。説明に React）
function saveFilterBoard() {
  saveDb({
    ...emptyDb(),
    boards: [board],
    columns: [column, { ...column, id: 'c2', title: '完了', position: 2000 }],
    cards: [
      card,
      { ...card, id: 'k2', title: 'API を作る', description: 'Express を使う', position: 2000 },
      { ...card, id: 'k3', columnId: 'c2', title: '画面を作る', description: 'React で作る' },
    ],
    labels: [label, { ...label, id: 'l2', name: '画面', color: 'blue' }],
    cardLabels: [
      { cardId: 'k1', labelId: 'l1' },
      { cardId: 'k3', labelId: 'l2' },
    ],
  })
}

async function openBoard(path = '/boards/b1') {
  saveFilterBoard()
  const user = userEvent.setup()
  const router = renderApp(path)
  await screen.findByRole('heading', { name: 'マイボード' })
  return { user, router }
}

// 表示しているカードのタイトル（ラベルの名前を含まない）
function shownCardTitles() {
  return screen
    .getAllByRole('button', { name: /^カード「/ })
    .map((element) => element.getAttribute('aria-label')?.match(/「(.+)」/)?.[1])
}

// 件数の表示（読み上げ）。dnd-kit の読み上げ用の要素も role="status" なので、絞り込みの欄の中から探す
function resultStatus() {
  return within(screen.getByRole('search', { name: 'カードの絞り込み' })).getByRole('status')
}

describe('カードの絞り込み', () => {
  it('文字で絞り込むと、タイトルか説明に含むカードだけが残り、件数を読み上げる', async () => {
    const { user, router } = await openBoard()
    expect(resultStatus()).toHaveTextContent('')

    // 大文字と小文字は区別しない。「テストを書く」と「画面を作る」は説明に React を含む
    await user.type(screen.getByRole('searchbox', { name: 'カードを検索' }), 'react')

    expect(shownCardTitles()).toEqual(['テストを書く', '画面を作る'])
    expect(resultStatus()).toHaveTextContent('2枚のカードが見つかりました')
    expect(router.state.location.search).toBe('?q=react')
    // 隠しているカードがあるカラム（ToDo の「API を作る」）には、その枚数を出す
    expect(screen.getByText('絞り込みで1枚を隠しています')).toBeVisible()
  })

  it('1枚もなくなったカラムも残し、条件に合うカードがないことを出す', async () => {
    const { user } = await openBoard()

    await user.type(screen.getByRole('searchbox', { name: 'カードを検索' }), 'API')

    // 「完了」のカードはすべて隠れるが、カラムは残る。ToDo と完了で1枚ずつ隠している
    expect(shownCardTitles()).toEqual(['API を作る'])
    expect(screen.getByRole('heading', { name: '完了' })).toBeVisible()
    expect(screen.getByText('条件に合うカードはありません')).toBeVisible()
    expect(screen.getAllByText('絞り込みで1枚を隠しています')).toHaveLength(2)
    // 見出しの枚数は、隠れているカードも含めたまま（カラムを削除すると一緒に消えるため）
    await user.click(screen.getByRole('button', { name: '「完了」を削除' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('中のカード1枚も削除されます')
  })

  it('ラベルを複数選ぶと、どれか1つが付いているカードが残る', async () => {
    const { user, router } = await openBoard()
    const group = within(screen.getByRole('group', { name: 'ラベルで絞り込む' }))

    await user.click(group.getByRole('button', { name: '急ぎ' }))
    expect(group.getByRole('button', { name: '急ぎ' })).toHaveAttribute('aria-pressed', 'true')
    expect(shownCardTitles()).toEqual(['テストを書く'])

    await user.click(group.getByRole('button', { name: '画面' }))
    expect(shownCardTitles()).toEqual(['テストを書く', '画面を作る'])
    expect(router.state.location.search).toBe('?label=l1&label=l2')

    // もう一度押すと外れる
    await user.click(group.getByRole('button', { name: '急ぎ' }))
    expect(group.getByRole('button', { name: '急ぎ' })).toHaveAttribute('aria-pressed', 'false')
    expect(shownCardTitles()).toEqual(['画面を作る'])
  })

  it('文字とラベルの両方を指定すると、両方に合うカードだけが残る', async () => {
    const { user } = await openBoard()

    await user.type(screen.getByRole('searchbox', { name: 'カードを検索' }), 'react')
    await user.click(screen.getByRole('button', { name: '急ぎ' }))

    expect(shownCardTitles()).toEqual(['テストを書く'])
    expect(resultStatus()).toHaveTextContent('1枚のカードが見つかりました')
  })

  it('URL に条件があれば、絞り込んだ状態で開く。削除されたラベルの ID は無視する', async () => {
    await openBoard('/boards/b1?q=%E7%94%BB%E9%9D%A2&label=l2&label=deleted')

    expect(screen.getByRole('searchbox', { name: 'カードを検索' })).toHaveValue('画面')
    expect(screen.getByRole('button', { name: '画面' })).toHaveAttribute('aria-pressed', 'true')
    expect(shownCardTitles()).toEqual(['画面を作る'])
  })

  it('カード詳細を開いて閉じても、条件が残る', async () => {
    const { user, router } = await openBoard()
    await user.type(screen.getByRole('searchbox', { name: 'カードを検索' }), 'react')

    await user.click(screen.getByRole('button', { name: 'カード「画面を作る」（ラベル：画面）' }))
    await screen.findByRole('dialog', { name: 'カードの編集' })
    expect(router.state.location.pathname).toBe('/boards/b1/cards/k3')
    expect(router.state.location.search).toBe('?q=react')

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(router.state.location.pathname).toBe('/boards/b1')
    expect(router.state.location.search).toBe('?q=react')
    expect(shownCardTitles()).toEqual(['テストを書く', '画面を作る'])
  })

  it('「条件をクリア」で、すべてのカードに戻り、入力欄にフォーカスが移る', async () => {
    const { user, router } = await openBoard('/boards/b1?q=api&label=l1')
    const searchbox = screen.getByRole('searchbox', { name: 'カードを検索' })

    await user.click(screen.getByRole('button', { name: '条件をクリア' }))

    expect(shownCardTitles()).toEqual(['テストを書く', 'API を作る', '画面を作る'])
    expect(searchbox).toHaveValue('')
    expect(searchbox).toHaveFocus()
    expect(router.state.location.search).toBe('')
    expect(screen.queryByRole('button', { name: '条件をクリア' })).not.toBeInTheDocument()
  })

  it('日本語入力の変換中は絞り込まず、確定したときに絞り込む', async () => {
    const { router } = await openBoard()
    const searchbox = screen.getByRole('searchbox', { name: 'カードを検索' })

    // user-event は変換（IME）を再現できないので、ブラウザが送るイベントを直接起こす
    fireEvent.compositionStart(searchbox)
    fireEvent.input(searchbox, { target: { value: 'がめん' }, isComposing: true })
    expect(searchbox).toHaveValue('がめん')
    expect(shownCardTitles()).toHaveLength(3)
    expect(router.state.location.search).toBe('')

    fireEvent.input(searchbox, { target: { value: '画面' }, isComposing: true })
    fireEvent.compositionEnd(searchbox)
    expect(shownCardTitles()).toEqual(['画面を作る'])
    expect(router.state.location.search).toBe('?q=%E7%94%BB%E9%9D%A2')
  })
})
