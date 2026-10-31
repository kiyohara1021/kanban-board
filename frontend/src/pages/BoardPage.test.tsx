import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { loadDb, saveDb } from '@/demo/db'
import { renderApp, saveSampleBoard, setToday } from '@/test/renderApp'
import { server } from '@/test/server'

// サーバーのエラー（500）を返すハンドラーの中身。server.use でこのテストの間だけ差し込む
function serverError() {
  return HttpResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'サーバーでエラーが発生しました' } },
    { status: 500 },
  )
}

// ボードを開き、取得が終わるまで待つ
async function openBoard() {
  saveSampleBoard()
  const user = userEvent.setup()
  renderApp('/boards/b1')
  await screen.findByRole('heading', { name: 'マイボード' })
  return user
}

describe('ボード', () => {
  it('ボード名をクリックして名前を変えられる', async () => {
    const user = await openBoard()

    await user.click(screen.getByRole('button', { name: 'マイボード' }))
    const input = screen.getByRole('textbox', { name: 'ボード名' })
    await user.clear(input)
    await user.type(input, '新しい名前{Enter}')

    expect(screen.getByRole('heading', { name: '新しい名前' })).toBeInTheDocument()
    await waitFor(() => expect(loadDb().boards[0]?.title).toBe('新しい名前'))
  })

  it('ボード名の保存に失敗したら、元の名前に戻してエラーを知らせる', async () => {
    server.use(http.patch('/api/boards/:boardId', serverError, { once: true }))
    const user = await openBoard()

    await user.click(screen.getByRole('button', { name: 'マイボード' }))
    const input = screen.getByRole('textbox', { name: 'ボード名' })
    await user.clear(input)
    await user.type(input, '新しい名前{Enter}')

    expect(await screen.findByText('サーバーでエラーが発生しました')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'マイボード' })).toBeInTheDocument()
    expect(loadDb().boards[0]?.title).toBe('マイボード')
  })
})

describe('カラム', () => {
  it('追加すると、ボードの最後に並ぶ', async () => {
    const user = await openBoard()

    await user.click(screen.getByRole('button', { name: 'カラムを追加' }))
    await user.type(screen.getByRole('textbox', { name: 'カラム名' }), '完了{Enter}')

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual(['ToDo', '完了'])
    await waitFor(() => expect(loadDb().columns.map((c) => c.title)).toEqual(['ToDo', '完了']))
  })

  it('名前をクリックして変えられる', async () => {
    const user = await openBoard()

    await user.click(screen.getByRole('button', { name: 'ToDo' }))
    const input = screen.getByRole('textbox', { name: 'カラム名' })
    await user.clear(input)
    await user.type(input, 'やること{Enter}')

    expect(screen.getByRole('heading', { name: 'やること' })).toBeInTheDocument()
    await waitFor(() => expect(loadDb().columns[0]?.title).toBe('やること'))
  })

  it('削除すると、確認したあとで中のカードと一緒に消える', async () => {
    const user = await openBoard()

    await user.click(screen.getByRole('button', { name: '「ToDo」を削除' }))
    const dialog = screen.getByRole('alertdialog', { name: '「ToDo」を削除しますか？' })
    // カードがあるときは、一緒に消えることを伝える
    expect(within(dialog).getByText(/中のカード1枚も削除されます/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '削除' }))

    expect(screen.queryByRole('heading', { name: 'ToDo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'カード「テストを書く」' })).not.toBeInTheDocument()
    await waitFor(() => expect(loadDb().columns).toEqual([]))
    expect(loadDb().cards).toEqual([])
  })
})

describe('カード', () => {
  it('追加すると、カラムの最後に並ぶ', async () => {
    const user = await openBoard()

    await user.click(screen.getByRole('button', { name: 'カードを追加' }))
    await user.type(screen.getByRole('textbox', { name: 'カードのタイトル' }), '画面を作る{Enter}')

    // dnd-kit がカードに role="button" を付けるので、ボタンとして探せる
    expect(screen.getByRole('button', { name: 'カード「画面を作る」' })).toBeInTheDocument()
    await waitFor(() =>
      expect(loadDb().cards.map((c) => c.title)).toEqual(['テストを書く', '画面を作る']),
    )
  })

  it('クリックすると、カード詳細が開いて URL が変わる', async () => {
    const user = await openBoard()
    await user.click(screen.getByRole('button', { name: 'カード「テストを書く」' }))

    expect(await screen.findByRole('dialog', { name: 'カードの編集' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('テストを書く')
  })

  it('期限日を過ぎたカードは「期限切れ」と表示し、期限日が今日のカードは期限切れにしない', async () => {
    setToday(2026, 11, 5)
    saveSampleBoard()
    const db = loadDb()
    const card = db.cards[0]!
    saveDb({
      ...db,
      cards: [
        { ...card, dueDate: '2026-11-04' },
        { ...card, id: 'k2', title: '今日まで', position: 2000, dueDate: '2026-11-05' },
        { ...card, id: 'k3', title: '来年', position: 3000, dueDate: '2027-01-10' },
      ],
    })
    renderApp('/boards/b1')

    // 色だけでなく、文字と読み上げ名でも期限切れが分かる
    const overdue = await screen.findByRole('button', {
      name: 'カード「テストを書く」（期限：11月4日、期限切れ）',
    })
    expect(within(overdue).getByText('期限切れ')).toBeInTheDocument()
    const dueToday = screen.getByRole('button', { name: 'カード「今日まで」（期限：11月5日）' })
    expect(within(dueToday).queryByText('期限切れ')).not.toBeInTheDocument()
    // 今年でない日付には年も付ける
    expect(
      screen.getByRole('button', { name: 'カード「来年」（期限：2027年1月10日）' }),
    ).toBeInTheDocument()
  })

  it('保存に失敗したら、画面を元に戻してエラーを知らせる', async () => {
    // 応答をすぐに返すと、画面に出たカードを確かめる前に元に戻ってしまう。
    // respond() を呼ぶまでサーバーの応答を止めておき、途中の画面を確かめてから失敗を返す
    let respond = () => {}
    const responded = new Promise<void>((resolve) => (respond = resolve))
    server.use(
      http.post(
        '/api/columns/:columnId/cards',
        async () => {
          await responded
          return serverError()
        },
        { once: true },
      ),
    )
    const user = await openBoard()

    await user.click(screen.getByRole('button', { name: 'カードを追加' }))
    await user.type(screen.getByRole('textbox', { name: 'カードのタイトル' }), '画面を作る{Enter}')

    // 楽観的更新で、API の結果を待たずにまず画面に出る
    expect(await screen.findByRole('button', { name: 'カード「画面を作る」' })).toBeInTheDocument()
    respond()
    // 失敗が分かったら、追加する前の状態に戻し、通知でエラーを知らせる
    expect(await screen.findByText('サーバーでエラーが発生しました')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'カード「画面を作る」' })).not.toBeInTheDocument()
    expect(loadDb().cards).toHaveLength(1)
  })
})
