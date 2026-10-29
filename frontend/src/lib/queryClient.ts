import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 取得してから 10 秒間は新しいとみなし、画面を開き直すたびに取り直さない
      staleTime: 10_000,
      // 失敗したときの再試行は1回まで（初期値は3回で、エラー表示まで時間がかかる）
      retry: 1,
    },
  },
})
