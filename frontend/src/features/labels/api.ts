import type { CreateLabelInput, Label } from '@kanban/shared'
import { apiFetch } from '@/lib/apiClient'

// docs/03-api.md のラベルのエンドポイント

export const createLabel = (boardId: string, input: CreateLabelInput) =>
  apiFetch<Label>('POST', `/boards/${boardId}/labels`, input)

export const deleteLabel = (labelId: string) => apiFetch<void>('DELETE', `/labels/${labelId}`)
