import type { Card, CreateCardInput, MoveCardInput, UpdateCardInput } from '@kanban/shared'
import { apiFetch } from '@/lib/apiClient'

// docs/03-api.md のカードのエンドポイント

export const createCard = (columnId: string, input: CreateCardInput) =>
  apiFetch<Card>('POST', `/columns/${columnId}/cards`, input)

export const getCard = (cardId: string) => apiFetch<Card>('GET', `/cards/${cardId}`)

export const updateCard = (cardId: string, input: UpdateCardInput) =>
  apiFetch<Card>('PATCH', `/cards/${cardId}`, input)

export const moveCard = (cardId: string, input: MoveCardInput) =>
  apiFetch<Card>('POST', `/cards/${cardId}/move`, input)

export const deleteCard = (cardId: string) => apiFetch<void>('DELETE', `/cards/${cardId}`)
