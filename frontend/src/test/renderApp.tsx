import type { Board, Column, Label } from '@kanban/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { emptyDb, saveDb, type CardRow } from '@/demo/db'
import { routes } from '@/app/routes'

// 画面のテストで共通に使うデータと描画の手順

const time = '2026-11-01T00:00:00.000Z'
export const board: Board = { id: 'b1', title: 'マイボード', createdAt: time, updatedAt: time }
export const column: Column = {
  id: 'c1',
  boardId: 'b1',
  title: 'ToDo',
  position: 1000,
  createdAt: time,
  updatedAt: time,
}
// DB の行なので labelIds は持たない。付いているラベルは cardLabels で表す
export const card: CardRow = {
  id: 'k1',
  columnId: 'c1',
  title: 'テストを書く',
  description: 'React Testing Library を使う',
  position: 1000,
  createdAt: time,
  updatedAt: time,
}
export const label: Label = {
  id: 'l1',
  boardId: 'b1',
  name: '急ぎ',
  color: 'red',
  createdAt: time,
  updatedAt: time,
}

// API は MSW（src/test/server.ts）が受ける。DB は各テストの前に空になるので、
// 必要なデータをテストの最初に保存しておく。DB はバックエンドと同じく、テーブルごとの平らな配列。
// ラベルはボードにあるだけで、カードには付いていない
export function saveSampleBoard() {
  saveDb({ ...emptyDb(), boards: [board], columns: [column], cards: [card], labels: [label] })
}

// アプリと同じルート定義を、ブラウザの URL ではなくメモリ上の URL で動かす。
// 保存に失敗したときの通知（toast）も確かめられるよう、通知の表示場所も置く。
// アプリの Toaster（components/ui/sonner.tsx）は jsdom にない matchMedia を使うので、sonner のものを使う
export function renderApp(path: string) {
  // テストごとに新しいキャッシュを作り、前のテストのデータが残らないようにする
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  )
  return router
}
