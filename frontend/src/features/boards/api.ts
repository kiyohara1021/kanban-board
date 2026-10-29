import type { Board, BoardDetail, CreateBoardInput, UpdateBoardInput } from '@kanban/shared'
import { apiFetch } from '@/lib/apiClient'

// docs/03-api.md のボードのエンドポイント

export const getBoards = () => apiFetch<Board[]>('GET', '/boards')

export const getBoard = (boardId: string) => apiFetch<BoardDetail>('GET', `/boards/${boardId}`)

export const createBoard = (input: CreateBoardInput) => apiFetch<Board>('POST', '/boards', input)

export const updateBoard = (boardId: string, input: UpdateBoardInput) =>
  apiFetch<Board>('PATCH', `/boards/${boardId}`, input)

export const deleteBoard = (boardId: string) => apiFetch<void>('DELETE', `/boards/${boardId}`)
