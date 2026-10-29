// docs/03-api.md の型と同じ形。Step 4 で shared/ の Zod スキーマに置き換える

export type Board = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type Column = {
  id: string
  boardId: string
  title: string
  position: number
  createdAt: string
  updatedAt: string
}

export type Card = {
  id: string
  columnId: string
  title: string
  description: string
  position: number
  createdAt: string
  updatedAt: string
}

export type ColumnWithCards = Column & { cards: Card[] }

// GET /boards/:boardId のレスポンス
export type BoardDetail = Board & { columns: ColumnWithCards[] }
