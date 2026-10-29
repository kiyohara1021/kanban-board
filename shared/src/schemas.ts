import { z } from 'zod'

// docs/02-data-model.md の文字数ルール
export const BOARD_TITLE_MAX = 100
export const COLUMN_TITLE_MAX = 50
export const CARD_TITLE_MAX = 100
export const CARD_DESCRIPTION_MAX = 2000

const title = (max: number) =>
  z
    .string()
    .trim()
    .min(1, '1文字以上で入力してください')
    .max(max, `${max}文字以内で入力してください`)

const description = z
  .string()
  .trim()
  .max(CARD_DESCRIPTION_MAX, `${CARD_DESCRIPTION_MAX}文字以内で入力してください`)

const index = z.number().int('整数で指定してください').min(0, '0以上で指定してください')

// ---- リクエストボディ（docs/03-api.md） ----

export const createBoardSchema = z.object({ title: title(BOARD_TITLE_MAX) })
export const updateBoardSchema = z.object({ title: title(BOARD_TITLE_MAX).optional() })

export const createColumnSchema = z.object({ title: title(COLUMN_TITLE_MAX) })
export const updateColumnSchema = z.object({ title: title(COLUMN_TITLE_MAX) })
export const moveColumnSchema = z.object({ index })

export const createCardSchema = z.object({
  title: title(CARD_TITLE_MAX),
  description: description.default(''),
})
export const updateCardSchema = z.object({
  title: title(CARD_TITLE_MAX).optional(),
  description: description.optional(),
})
export const moveCardSchema = z.object({
  columnId: z.string().min(1, '移動先のカラムを指定してください'),
  index,
})

export type CreateBoardInput = z.infer<typeof createBoardSchema>
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>
export type CreateColumnInput = z.infer<typeof createColumnSchema>
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>
export type MoveColumnInput = z.infer<typeof moveColumnSchema>
export type CreateCardInput = z.infer<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type MoveCardInput = z.infer<typeof moveCardSchema>

// ---- レスポンス ----
// 日時は JSON では ISO 8601 の文字列になる

export const boardSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const columnSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  title: z.string(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const cardSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  title: z.string(),
  description: z.string(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const columnWithCardsSchema = columnSchema.extend({ cards: z.array(cardSchema) })

// GET /boards/:boardId のレスポンス
export const boardDetailSchema = boardSchema.extend({ columns: z.array(columnWithCardsSchema) })

export type Board = z.infer<typeof boardSchema>
export type Column = z.infer<typeof columnSchema>
export type Card = z.infer<typeof cardSchema>
export type ColumnWithCards = z.infer<typeof columnWithCardsSchema>
export type BoardDetail = z.infer<typeof boardDetailSchema>

// ---- エラーレスポンス ----

export type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR'

export type ErrorResponse = {
  error: {
    code: ErrorCode
    message: string
    details?: { path: string; message: string }[]
  }
}
