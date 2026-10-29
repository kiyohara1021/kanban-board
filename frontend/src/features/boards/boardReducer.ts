import type { BoardDetail, Card, ColumnWithCards } from './types'

// id と now はアクションに含めて渡す。reducer の中で crypto.randomUUID() や new Date() を
// 呼ぶと、同じ入力でも結果が変わる「純粋でない」関数になってしまう
// （開発中の StrictMode は reducer を2回呼ぶので、ずれがすぐ表に出る）
export type BoardAction =
  | { type: 'addColumn'; id: string; title: string; now: string }
  | { type: 'renameColumn'; columnId: string; title: string; now: string }
  | { type: 'deleteColumn'; columnId: string }
  | { type: 'addCard'; id: string; columnId: string; title: string; now: string }
  | {
      type: 'updateCard'
      cardId: string
      title?: string
      description?: string
      now: string
    }
  | { type: 'deleteCard'; cardId: string }

const POSITION_GAP = 1000

// 末尾に追加するときの position（docs/02-data-model.md）
function nextPosition(items: { position: number }[]): number {
  return (items.at(-1)?.position ?? 0) + POSITION_GAP
}

// 対象のカラムだけを作り直し、それ以外のカラムは同じオブジェクトのまま返す
function updateColumn(
  board: BoardDetail,
  isTarget: (column: ColumnWithCards) => boolean,
  update: (column: ColumnWithCards) => ColumnWithCards,
): BoardDetail {
  return {
    ...board,
    columns: board.columns.map((column) => (isTarget(column) ? update(column) : column)),
  }
}

function hasCard(cardId: string) {
  return (column: ColumnWithCards) => column.cards.some((card) => card.id === cardId)
}

export function boardReducer(board: BoardDetail, action: BoardAction): BoardDetail {
  switch (action.type) {
    case 'addColumn': {
      const column: ColumnWithCards = {
        id: action.id,
        boardId: board.id,
        title: action.title,
        position: nextPosition(board.columns),
        createdAt: action.now,
        updatedAt: action.now,
        cards: [],
      }
      return { ...board, columns: [...board.columns, column] }
    }

    case 'renameColumn':
      return updateColumn(
        board,
        (column) => column.id === action.columnId,
        (column) => ({ ...column, title: action.title, updatedAt: action.now }),
      )

    case 'deleteColumn':
      return {
        ...board,
        columns: board.columns.filter((column) => column.id !== action.columnId),
      }

    case 'addCard':
      return updateColumn(
        board,
        (column) => column.id === action.columnId,
        (column) => {
          const card: Card = {
            id: action.id,
            columnId: column.id,
            title: action.title,
            description: '',
            position: nextPosition(column.cards),
            createdAt: action.now,
            updatedAt: action.now,
          }
          return { ...column, cards: [...column.cards, card] }
        },
      )

    case 'updateCard':
      return updateColumn(board, hasCard(action.cardId), (column) => ({
        ...column,
        cards: column.cards.map((card) =>
          card.id === action.cardId
            ? {
                ...card,
                title: action.title ?? card.title,
                description: action.description ?? card.description,
                updatedAt: action.now,
              }
            : card,
        ),
      }))

    case 'deleteCard':
      return updateColumn(board, hasCard(action.cardId), (column) => ({
        ...column,
        cards: column.cards.filter((card) => card.id !== action.cardId),
      }))
  }
}

export function findCard(board: BoardDetail, cardId: string): Card | undefined {
  for (const column of board.columns) {
    const card = column.cards.find((card) => card.id === cardId)
    if (card) return card
  }
  return undefined
}
