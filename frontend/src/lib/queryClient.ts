import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './apiClient'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 取得してから 10 秒間は新しいとみなし、画面を開き直すたびに取り直さない
      staleTime: 10_000,
      // 失敗したときの再試行は1回まで（初期値は3回で、エラー表示まで時間がかかる）。
      // 404 など 4xx は何度送っても結果が変わらないので、再試行しない
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false
        return failureCount < 1
      },
    },
  },
})
