import type { BoardDetail, CreateBoardInput, UpdateBoardInput } from '@kanban/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createBoard, deleteBoard, getBoard, getBoards, updateBoard } from './api'

// クエリキー。配列の先頭が同じものは、まとめて無効化（invalidate）できる
export const boardKeys = {
  all: ['boards'] as const,
  detail: (boardId: string) => ['boards', boardId] as const,
}

export function useBoards() {
  return useQuery({ queryKey: boardKeys.all, queryFn: getBoards })
}

export function useBoard(boardId: string) {
  return useQuery({ queryKey: boardKeys.detail(boardId), queryFn: () => getBoard(boardId) })
}

export function useCreateBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBoardInput) => createBoard(input),
    onError: (error) => toast.error(error.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKeys.all, exact: true }),
  })
}

// ボード名の変更。ボード画面の見出しをすぐ変えたいので、詳細のキャッシュを先に書き換える
export function useUpdateBoard(boardId: string) {
  const queryClient = useQueryClient()
  const queryKey = boardKeys.detail(boardId)
  return useMutation({
    mutationFn: (input: UpdateBoardInput) => updateBoard(boardId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<BoardDetail>(queryKey)
      if (previous) {
        queryClient.setQueryData(queryKey, { ...previous, title: input.title ?? previous.title })
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      toast.error(error.message)
    },
    // 一覧（['boards']）と詳細（['boards', boardId]）の両方を取り直す
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKeys.all }),
  })
}

export function useDeleteBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (boardId: string) => deleteBoard(boardId),
    // 削除したボードの詳細はもう使わないので、キャッシュから消す
    onSuccess: (_data, boardId) =>
      queryClient.removeQueries({ queryKey: boardKeys.detail(boardId) }),
    onError: (error) => toast.error(error.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKeys.all, exact: true }),
  })
}
