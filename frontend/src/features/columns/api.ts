import type { Column, CreateColumnInput, MoveColumnInput, UpdateColumnInput } from '@kanban/shared'
import { apiFetch } from '@/lib/apiClient'

// docs/03-api.md のカラムのエンドポイント

export const createColumn = (boardId: string, input: CreateColumnInput) =>
  apiFetch<Column>('POST', `/boards/${boardId}/columns`, input)

export const updateColumn = (columnId: string, input: UpdateColumnInput) =>
  apiFetch<Column>('PATCH', `/columns/${columnId}`, input)

export const moveColumn = (columnId: string, input: MoveColumnInput) =>
  apiFetch<Column>('POST', `/columns/${columnId}/move`, input)

export const deleteColumn = (columnId: string) => apiFetch<void>('DELETE', `/columns/${columnId}`)
