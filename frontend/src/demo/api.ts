import {
  createBoardSchema,
  createCardSchema,
  createColumnSchema,
  moveCardSchema,
  moveColumnSchema,
  POSITION_GAP,
  positionForInsert,
  updateBoardSchema,
  updateCardSchema,
  updateColumnSchema,
  type BoardDetail,
  type ErrorResponse,
} from '@kanban/shared'
import type { z } from 'zod'
import type { DemoDb } from './db'

// デモ版の API の処理。backend/src/services と同じ規則で、DemoDb を読み書きする。
// 入力の検証と並び順の計算には、バックエンドと同じ @kanban/shared の関数を使う

export class DemoApiError extends Error {
  readonly status: number
  readonly body: ErrorResponse

  constructor(status: number, body: ErrorResponse) {
    super(body.error.message)
    this.status = status
    this.body = body
  }
}

const notFound = (what: string) =>
  new DemoApiError(404, { error: { code: 'NOT_FOUND', message: `${what}が見つかりません` } })

const invalid = (details: { path: string; message: string }[]) =>
  new DemoApiError(400, {
    error: { code: 'VALIDATION_ERROR', message: '入力内容に誤りがあります', details },
  })

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body ?? {})
  if (!result.success) {
    throw invalid(
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    )
  }
  return result.data
}

const now = () => new Date().toISOString()
const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position

function findBoard(db: DemoDb, boardId: string) {
  const board = db.boards.find((board) => board.id === boardId)
  if (!board) throw notFound('ボード')
  return board
}

function findColumn(db: DemoDb, columnId: string) {
  const column = db.columns.find((column) => column.id === columnId)
  if (!column) throw notFound('カラム')
  return column
}

function findCard(db: DemoDb, cardId: string) {
  const card = db.cards.find((card) => card.id === cardId)
  if (!card) throw notFound('カード')
  return card
}

// ---- ボード ----

// 新しいボードに最初から用意するカラム（backend/src/services/boardService.ts と同じ）
const DEFAULT_COLUMNS = ['ToDo', '進行中', '完了']

export function listBoards(db: DemoDb) {
  return [...db.boards].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createBoard(db: DemoDb, body: unknown) {
  const input = parse(createBoardSchema, body)
  const time = now()
  const board = { id: crypto.randomUUID(), title: input.title, createdAt: time, updatedAt: time }
  db.boards.push(board)
  DEFAULT_COLUMNS.forEach((title, i) => {
    db.columns.push({
      id: crypto.randomUUID(),
      boardId: board.id,
      title,
      position: (i + 1) * POSITION_GAP,
      createdAt: time,
      updatedAt: time,
    })
  })
  return board
}

export function getBoardDetail(db: DemoDb, boardId: string): BoardDetail {
  const board = findBoard(db, boardId)
  return {
    ...board,
    columns: db.columns
      .filter((column) => column.boardId === boardId)
      .sort(byPosition)
      .map((column) => ({
        ...column,
        cards: db.cards.filter((card) => card.columnId === column.id).sort(byPosition),
      })),
  }
}

export function updateBoard(db: DemoDb, boardId: string, body: unknown) {
  const input = parse(updateBoardSchema, body)
  const board = findBoard(db, boardId)
  Object.assign(board, input.title === undefined ? {} : { title: input.title }, {
    updatedAt: now(),
  })
  return board
}

// 中のカラムとカードも消す（DB のカスケード削除と同じ）
export function deleteBoard(db: DemoDb, boardId: string) {
  findBoard(db, boardId)
  const columnIds = new Set(db.columns.filter((c) => c.boardId === boardId).map((c) => c.id))
  db.cards = db.cards.filter((card) => !columnIds.has(card.columnId))
  db.columns = db.columns.filter((column) => column.boardId !== boardId)
  db.boards = db.boards.filter((board) => board.id !== boardId)
}

// ---- カラム ----

export function createColumn(db: DemoDb, boardId: string, body: unknown) {
  const input = parse(createColumnSchema, body)
  findBoard(db, boardId)
  const siblings = db.columns.filter((column) => column.boardId === boardId).sort(byPosition)
  const time = now()
  const column = {
    id: crypto.randomUUID(),
    boardId,
    title: input.title,
    position: positionForInsert(siblings, siblings.length).position,
    createdAt: time,
    updatedAt: time,
  }
  db.columns.push(column)
  return column
}

export function updateColumn(db: DemoDb, columnId: string, body: unknown) {
  const input = parse(updateColumnSchema, body)
  const column = findColumn(db, columnId)
  Object.assign(column, { title: input.title, updatedAt: now() })
  return column
}

export function moveColumn(db: DemoDb, columnId: string, body: unknown) {
  const input = parse(moveColumnSchema, body)
  const column = findColumn(db, columnId)
  const siblings = db.columns
    .filter((other) => other.boardId === column.boardId && other.id !== columnId)
    .sort(byPosition)
  const { items, position } = positionForInsert(siblings, input.index)
  // 振り直したときは、ほかのカラムの position も書き換える
  for (const item of items) findColumn(db, item.id).position = item.position
  Object.assign(column, { position, updatedAt: now() })
  return column
}

export function deleteColumn(db: DemoDb, columnId: string) {
  findColumn(db, columnId)
  db.cards = db.cards.filter((card) => card.columnId !== columnId)
  db.columns = db.columns.filter((column) => column.id !== columnId)
}

// ---- カード ----

export function createCard(db: DemoDb, columnId: string, body: unknown) {
  const input = parse(createCardSchema, body)
  findColumn(db, columnId)
  const siblings = db.cards.filter((card) => card.columnId === columnId).sort(byPosition)
  const time = now()
  const card = {
    id: crypto.randomUUID(),
    columnId,
    title: input.title,
    description: input.description,
    position: positionForInsert(siblings, siblings.length).position,
    createdAt: time,
    updatedAt: time,
  }
  db.cards.push(card)
  return card
}

export function getCard(db: DemoDb, cardId: string) {
  return findCard(db, cardId)
}

export function updateCard(db: DemoDb, cardId: string, body: unknown) {
  const input = parse(updateCardSchema, body)
  const card = findCard(db, cardId)
  if (input.title !== undefined) card.title = input.title
  if (input.description !== undefined) card.description = input.description
  card.updatedAt = now()
  return card
}

export function moveCard(db: DemoDb, cardId: string, body: unknown) {
  const input = parse(moveCardSchema, body)
  const card = findCard(db, cardId)
  const fromColumn = findColumn(db, card.columnId)
  // 移動先は、同じボードのカラムに限る
  const toColumn = db.columns.find((column) => column.id === input.columnId)
  if (!toColumn || toColumn.boardId !== fromColumn.boardId) {
    throw invalid([{ path: 'columnId', message: '同じボードのカラムを指定してください' }])
  }
  const siblings = db.cards
    .filter((other) => other.columnId === toColumn.id && other.id !== cardId)
    .sort(byPosition)
  const { items, position } = positionForInsert(siblings, input.index)
  for (const item of items) findCard(db, item.id).position = item.position
  Object.assign(card, { columnId: toColumn.id, position, updatedAt: now() })
  return card
}

export function deleteCard(db: DemoDb, cardId: string) {
  findCard(db, cardId)
  db.cards = db.cards.filter((card) => card.id !== cardId)
}
