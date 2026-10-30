import type { RouteObject } from 'react-router'
import { NotFoundPage } from './NotFoundPage'
import { PageLoading } from './PageLoading'
import { RootLayout } from './RootLayout'
import { RouteErrorBoundary } from './RouteErrorBoundary'

// 画面と URL の対応（docs/01-requirements.md の「画面」）。
// app/router.tsx ではブラウザの URL で、テストではメモリ上の URL で、この同じ定義を使う
export const routes: RouteObject[] = [
  {
    // すべてのページの親になるルート。path を持たず、ページを <Outlet /> の位置に出す
    Component: RootLayout,
    // 子のページの描画中にエラーが起きたら、ページの代わりにこれを出す（画面が真っ白にならない）
    ErrorBoundary: RouteErrorBoundary,
    // 最初に開いたページのコードを読み込んでいる間に出す
    HydrateFallback: PageLoading,
    children: [
      {
        index: true,
        // lazy：このページを初めて開くときに、ページのファイルを読み込む。
        // ビルドするとページごとに JS が分かれ、最初に読み込む量が減る
        lazy: async () => {
          const { BoardListPage } = await import('@/pages/BoardListPage')
          return { Component: BoardListPage }
        },
      },
      {
        path: 'boards/:boardId',
        lazy: async () => {
          const { BoardPage } = await import('@/pages/BoardPage')
          return { Component: BoardPage }
        },
        // 子ルート。BoardPage の <Outlet /> の位置に表示される
        children: [
          {
            path: 'cards/:cardId',
            lazy: async () => {
              const { CardDetailRoute } = await import('@/pages/CardDetailRoute')
              return { Component: CardDetailRoute }
            },
          },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]
