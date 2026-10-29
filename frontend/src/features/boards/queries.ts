import type { CreateBoardInput } from '@kanban/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBoard, getBoard, getBoards } from './api'

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.all }),
  })
}
