import {
  createBoardSchema,
  createColumnSchema,
  createLabelSchema,
  updateBoardSchema,
} from '@kanban/shared'
import { Router } from 'express'
import { parseBody } from '../lib/validate'
import {
  createBoard,
  deleteBoard,
  getBoardDetail,
  listBoards,
  updateBoard,
} from '../services/boardService'
import { createColumn } from '../services/columnService'
import { createLabel } from '../services/labelService'

// routes は「URL とメソッド」「入力の検証」「ステータスコード」だけを担当し、DB の操作は services に任せる
export const boardsRouter = Router()

boardsRouter.get('/', async (_req, res) => {
  res.json(await listBoards())
})

boardsRouter.post('/', async (req, res) => {
  const input = parseBody(createBoardSchema, req.body)
  res.status(201).json(await createBoard(input))
})

boardsRouter.get('/:boardId', async (req, res) => {
  res.json(await getBoardDetail(req.params.boardId))
})

boardsRouter.patch('/:boardId', async (req, res) => {
  const input = parseBody(updateBoardSchema, req.body)
  res.json(await updateBoard(req.params.boardId, input))
})

boardsRouter.delete('/:boardId', async (req, res) => {
  await deleteBoard(req.params.boardId)
  res.status(204).end()
})

boardsRouter.post('/:boardId/columns', async (req, res) => {
  const input = parseBody(createColumnSchema, req.body)
  res.status(201).json(await createColumn(req.params.boardId, input))
})

boardsRouter.post('/:boardId/labels', async (req, res) => {
  const input = parseBody(createLabelSchema, req.body)
  res.status(201).json(await createLabel(req.params.boardId, input))
})
