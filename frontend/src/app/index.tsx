import { AppProvider } from './provider'
import { AppRouter } from './router'

// アプリ全体。Provider（provider.tsx）の中にルーター（router.tsx）を置く
export function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}
