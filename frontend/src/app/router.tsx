import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './routes'

// GitHub Pages では /kanban-board/ の下で公開されるので、URL の先頭（basename）を合わせる。
// ルーターは描画のたびに作り直さないよう、コンポーネントの外で1つだけ作る
const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })

export function AppRouter() {
  return <RouterProvider router={router} />
}
