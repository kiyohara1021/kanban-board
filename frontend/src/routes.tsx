import { Link, type RouteObject } from 'react-router'
import { StatusMessage } from '@/components/StatusMessage'
import { BoardListPage } from '@/pages/BoardListPage'
import { BoardPage } from '@/pages/BoardPage'
import { CardDetailRoute } from '@/pages/CardDetailRoute'

// 画面と URL の対応（docs/01-requirements.md の「画面」）。
// main.tsx ではブラウザの URL で、テストではメモリ上の URL で、この同じ定義を使う
export const routes: RouteObject[] = [
  { path: '/', element: <BoardListPage /> },
  {
    path: '/boards/:boardId',
    element: <BoardPage />,
    // 子ルート。BoardPage の <Outlet /> の位置に表示される
    children: [{ path: 'cards/:cardId', element: <CardDetailRoute /> }],
  },
  {
    path: '*',
    element: (
      <StatusMessage>
        <p>ページが見つかりません。</p>
        <Link to="/" className="text-sky-700 underline">
          ボード一覧に戻る
        </Link>
      </StatusMessage>
    ),
  },
]
