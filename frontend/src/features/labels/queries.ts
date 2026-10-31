import type { BoardDetail, CreateLabelInput } from '@kanban/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { boardKeys } from '@/features/boards/queries'
import { createLabel } from './api'

// ラベルの作成。ほかのボードの変更（useBoardAction）と違い、楽観的更新をしない。
// 作ったラベルはすぐカードに付けるので、仮の ID ではなく、サーバーが決めた ID が要るため。
// 仮の ID のままカードに付けて保存すると、サーバーには存在しない ID なので 400 になってしまう
export function useCreateLabel(boardId: string) {
  const queryClient = useQueryClient()
  const queryKey = boardKeys.detail(boardId)
  return useMutation({
    mutationFn: (input: CreateLabelInput) => createLabel(boardId, input),
    // 届いたラベルをキャッシュのボードに足し、取り直しを待たずに画面に出す
    onSuccess: (label) => {
      queryClient.setQueryData<BoardDetail>(
        queryKey,
        (board) => board && { ...board, labels: [...board.labels, label] },
      )
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
