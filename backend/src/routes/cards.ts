import { moveCardSchema, updateCardSchema } from '@kanban/shared'
import { Router } from 'express'
import { parseBody } from '../lib/validate'
import { deleteCard, getCard, moveCard, updateCard } from '../services/cardService'

export const cardsRouter = Router()

cardsRouter.get('/:cardId', async (req, res) => {
  res.json(await getCard(req.params.cardId))
})

cardsRouter.patch('/:cardId', async (req, res) => {
  const input = parseBody(updateCardSchema, req.body)
  res.json(await updateCard(req.params.cardId, input))
})

cardsRouter.post('/:cardId/move', async (req, res) => {
  const input = parseBody(moveCardSchema, req.body)
  res.json(await moveCard(req.params.cardId, input))
})

cardsRouter.delete('/:cardId', async (req, res) => {
  await deleteCard(req.params.cardId)
  res.status(204).end()
})
