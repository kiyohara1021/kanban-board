import { createCardSchema, moveColumnSchema, updateColumnSchema } from '@kanban/shared'
import { Router } from 'express'
import { parseBody } from '../lib/validate'
import { createCard } from '../services/cardService'
import { deleteColumn, moveColumn, updateColumn } from '../services/columnService'

export const columnsRouter = Router()

columnsRouter.patch('/:columnId', async (req, res) => {
  const input = parseBody(updateColumnSchema, req.body)
  res.json(await updateColumn(req.params.columnId, input))
})

columnsRouter.post('/:columnId/move', async (req, res) => {
  const input = parseBody(moveColumnSchema, req.body)
  res.json(await moveColumn(req.params.columnId, input))
})

columnsRouter.delete('/:columnId', async (req, res) => {
  await deleteColumn(req.params.columnId)
  res.status(204).end()
})

columnsRouter.post('/:columnId/cards', async (req, res) => {
  const input = parseBody(createCardSchema, req.body)
  res.status(201).json(await createCard(req.params.columnId, input))
})
