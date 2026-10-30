import type { Board, Card, Column } from '@kanban/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { loadDb, saveDb } from '@/demo/db'
import { server } from '@/test/server'
import { routes } from './routes'

const time = '2026-11-01T00:00:00.000Z'
const board: Board = { id: 'b1', title: 'マイボード', createdAt: time, updatedAt: time }
const column: Column = {
  id: 'c1',
  boardId: 'b1',
  title: 'ToDo',
  position: 1000,
  createdAt: time,
  updatedAt: time,
}
const card: Card = {
  id: 'k1',
  columnId: 'c1',
  title: 'テストを書く',
  description: 'React Testing Library を使う',
  position: 1000,
  createdAt: time,
  updatedAt: time,
}

// API は MSW（src/test/server.ts）が受ける。DB は各テストの前に空になるので、
// 必要なデータをテストの最初に保存しておく。DB はバックエンドと同じく、テーブルごとの平らな配列
function saveSampleBoard() {
  saveDb({ boards: [board], columns: [column], cards: [card] })
}

// アプリと同じルート定義を、ブラウザの URL ではなくメモリ上の URL で動かす
function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('画面の移動', () => {
  it('ボード一覧から、ボードを作るとそのボードが開く', async () => {
    saveSampleBoard()
    const user = userEvent.setup()
    const router = renderApp('/')

    // 取得が終わるまで待つ（find〜 は、見つかるまで少し待ってくれる）
    expect(await screen.findByRole('heading', { name: 'マイボード' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ボードを作成' }))
    await user.type(screen.getByRole('textbox', { name: 'ボード名' }), '新しいボード{Enter}')

    expect(await screen.findByRole('heading', { name: '新しいボード' })).toBeInTheDocument()
    // POST /api/boards が届き、DB に保存されている。ID はサーバー（MSW）が決める
    const created = loadDb().boards.find((b) => b.title === '新しいボード')
    expect(created).toBeDefined()
    expect(router.state.location.pathname).toBe(`/boards/${created?.id}`)
  })

  it('カードの URL を直接開くと、ボードの上にカード詳細が出る', async () => {
    saveSampleBoard()
    renderApp('/boards/b1/cards/k1')

    const dialog = await screen.findByRole('dialog', { name: 'カードの編集' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('テストを書く')
    // 後ろにボードも表示されている
    expect(screen.getByRole('heading', { name: 'マイボード', hidden: true })).toBeInTheDocument()
  })

  it('存在しないカードの URL は、ボードに戻す', async () => {
    saveSampleBoard()
    const router = renderApp('/boards/b1/cards/unknown')

    expect(await screen.findByRole('heading', { name: 'マイボード' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/boards/b1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('存在しないボードは、メッセージと一覧へのリンクを出す', async () => {
    renderApp('/boards/unknown')

    expect(await screen.findByText('ボードが見つかりません')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ボード一覧に戻る' })).toHaveAttribute('href', '/')
    // 404 は再読み込みしても変わらないので、ボタンを出さない
    expect(screen.queryByRole('button', { name: '再読み込み' })).not.toBeInTheDocument()
  })

  it('一覧の取得に失敗したら、エラーを出し、再読み込みで取り直せる', async () => {
    saveSampleBoard()
    // このテストだけ、最初の GET /api/boards を 500 にする（once: true で1回だけ）。
    // server.use で足したハンドラーは、デモ版のハンドラーより先に使われる。
    // 2回目からはデモ版のハンドラーに戻るので、再読み込みで一覧が出る
    server.use(
      http.get(
        '/api/boards',
        () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'サーバーでエラーが発生しました' } },
            { status: 500 },
          ),
        { once: true },
      ),
    )
    const user = userEvent.setup()
    renderApp('/')

    expect(await screen.findByText('サーバーでエラーが発生しました')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '再読み込み' }))

    expect(await screen.findByRole('heading', { name: 'マイボード' })).toBeInTheDocument()
  })
})
