import type { Board, BoardDetail } from '@kanban/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from './routes'

const time = '2026-11-01T00:00:00.000Z'
const board: Board = { id: 'b1', title: 'マイボード', createdAt: time, updatedAt: time }
const boardDetail: BoardDetail = {
  ...board,
  columns: [
    {
      id: 'c1',
      boardId: 'b1',
      title: 'ToDo',
      position: 1000,
      createdAt: time,
      updatedAt: time,
      cards: [
        {
          id: 'k1',
          columnId: 'c1',
          title: 'テストを書く',
          description: 'React Testing Library を使う',
          position: 1000,
          createdAt: time,
          updatedAt: time,
        },
      ],
    },
  ],
}

// 「メソッド URL」ごとに返すデータを決めて、fetch を偽物に差し替える。登録のないものは 404
function mockApi(responses: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`
    if (!(key in responses)) {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: 'ボードが見つかりません' } },
        { status: 404 },
      )
    }
    return Response.json(responses[key], { status: key.startsWith('POST') ? 201 : 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('画面の移動', () => {
  it('ボード一覧から、ボードを作るとそのボードが開く', async () => {
    const created: Board = { ...board, id: 'b2', title: '新しいボード' }
    const fetchMock = mockApi({
      'GET /api/boards': [board],
      'POST /api/boards': created,
      'GET /api/boards/b2': { ...created, columns: [] },
    })
    const user = userEvent.setup()
    const router = renderApp('/')

    // 取得が終わるまで待つ（find〜 は、見つかるまで少し待ってくれる）
    expect(await screen.findByRole('heading', { name: 'マイボード' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ボードを作成' }))
    await user.type(screen.getByRole('textbox', { name: 'ボード名' }), '新しいボード{Enter}')

    expect(await screen.findByRole('heading', { name: '新しいボード' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/boards/b2')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/boards',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('カードの URL を直接開くと、ボードの上にカード詳細が出る', async () => {
    mockApi({ 'GET /api/boards/b1': boardDetail })
    renderApp('/boards/b1/cards/k1')

    const dialog = await screen.findByRole('dialog', { name: 'カードの編集' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('テストを書く')
    // 後ろにボードも表示されている
    expect(screen.getByRole('heading', { name: 'マイボード', hidden: true })).toBeInTheDocument()
  })

  it('存在しないカードの URL は、ボードに戻す', async () => {
    mockApi({ 'GET /api/boards/b1': boardDetail })
    const router = renderApp('/boards/b1/cards/unknown')

    expect(await screen.findByRole('heading', { name: 'マイボード' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/boards/b1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('存在しないボードは、メッセージと一覧へのリンクを出す', async () => {
    mockApi({})
    renderApp('/boards/unknown')

    expect(await screen.findByText('ボードが見つかりません')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ボード一覧に戻る' })).toHaveAttribute('href', '/')
    // 404 は再読み込みしても変わらないので、ボタンを出さない
    expect(screen.queryByRole('button', { name: '再読み込み' })).not.toBeInTheDocument()
  })
})
