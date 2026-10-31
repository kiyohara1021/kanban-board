import {
  positionForInsert,
  type BoardDetail,
  type Card,
  type ColumnWithCards,
} from '@kanban/shared'

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
      // 付けた後のラベルの ID をすべて入れる（PATCH /cards/:cardId と同じ）
      labelIds?: string[]
      now: string
    }
  | { type: 'deleteCard'; cardId: string }
  // ラベルの作成は楽観的更新をしないので、アクションにはない（features/labels/queries.ts）
  | { type: 'deleteLabel'; labelId: string }
  // index は移動先での位置（0始まり）。移動する要素自身を除いた並びで数える（docs/03-api.md の /move と同じ）
  | { type: 'moveColumn'; columnId: string; index: number; now: string }
  | { type: 'moveCard'; cardId: string; toColumnId: string; index: number; now: string }

function nextPosition(items: { position: number }[]): number {
  return positionForInsert(items, items.length).position
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
            labelIds: [],
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
                labelIds: action.labelIds ?? card.labelIds,
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

    // ボードのラベル一覧から消し、付けていたカードからも外す（サーバーのカスケード削除と同じ結果にする）
    case 'deleteLabel': {
      const hasLabel = (card: Card) => card.labelIds.includes(action.labelId)
      const withoutLabel = updateColumn(
        board,
        (column) => column.cards.some(hasLabel),
        (column) => ({
          ...column,
          cards: column.cards.map((card) =>
            hasLabel(card)
              ? { ...card, labelIds: card.labelIds.filter((id) => id !== action.labelId) }
              : card,
          ),
        }),
      )
      return {
        ...withoutLabel,
        labels: board.labels.filter((label) => label.id !== action.labelId),
      }
    }

    case 'moveColumn': {
      const from = board.columns.findIndex((column) => column.id === action.columnId)
      // 動いていなければ同じオブジェクトを返す（画面の再描画も起きない）
      if (from === -1 || from === action.index) return board

      const rest = board.columns.filter((column) => column.id !== action.columnId)
      const { items, position } = positionForInsert(rest, action.index)
      const moved = { ...board.columns[from], position, updatedAt: action.now }
      // toSpliced は元の配列を変えずに、要素を挿入した新しい配列を返す（ES2023）
      return { ...board, columns: items.toSpliced(action.index, 0, moved) }
    }

    case 'moveCard': {
      const fromColumn = board.columns.find(hasCard(action.cardId))
      const toColumn = board.columns.find((column) => column.id === action.toColumnId)
      if (!fromColumn || !toColumn) return board

      const from = fromColumn.cards.findIndex((card) => card.id === action.cardId)
      if (fromColumn === toColumn && from === action.index) return board

      const rest = toColumn.cards.filter((card) => card.id !== action.cardId)
      const { items, position } = positionForInsert(rest, action.index)
      const moved: Card = {
        ...fromColumn.cards[from],
        columnId: toColumn.id,
        position,
        updatedAt: action.now,
      }
      return updateColumn(
        board,
        (column) => column === fromColumn || column === toColumn,
        (column) =>
          column === toColumn
            ? { ...column, cards: items.toSpliced(action.index, 0, moved) }
            : { ...column, cards: column.cards.filter((card) => card.id !== action.cardId) },
      )
    }
  }
}

export function findCard(board: BoardDetail, cardId: string): Card | undefined {
  for (const column of board.columns) {
    const card = column.cards.find((card) => card.id === cardId)
    if (card) return card
  }
  return undefined
}

export function findColumnOfCard(board: BoardDetail, cardId: string): ColumnWithCards | undefined {
  return board.columns.find(hasCard(cardId))
}
