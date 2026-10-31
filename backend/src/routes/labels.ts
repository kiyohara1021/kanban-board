import { Router } from 'express'
import { deleteLabel } from '../services/labelService'

export const labelsRouter = Router()

labelsRouter.delete('/:labelId', async (req, res) => {
  await deleteLabel(req.params.labelId)
  res.status(204).end()
})
