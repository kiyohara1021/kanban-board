import { describe, expect, it } from 'vitest'
import { boardReducer, findCard } from './boardReducer'
import { mockBoard } from './mockBoard'
import type { BoardDetail } from '@kanban/shared'

const now = '2026-11-01T00:00:00.000Z'

// 凍結したオブジェクトを書き換えようとするとエラーになる。
// reducer が元の state を直接書き換えていないことを確かめるために使う
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

function createBoard(): BoardDetail {
  return deepFreeze(structuredClone(mockBoard))
}

describe('boardReducer', () => {
  describe('addColumn', () => {
    it('末尾に空のカラムを追加する', () => {
      const board = createBoard()
      const next = boardReducer(board, { type: 'addColumn', id: 'new', title: 'レビュー', now })

      expect(next.columns.map((column) => column.title)).toEqual([
        'ToDo',
        '進行中',
        '完了',
        '保留',
        'レビュー',
      ])
      expect(next.columns.at(-1)).toMatchObject({ id: 'new', position: 5000, cards: [] })
    })
  })

  describe('renameColumn', () => {
    it('対象のカラムだけ名前を変え、ほかのカラムは同じオブジェクトのまま残す', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'renameColumn',
        columnId: 'column-1',
        title: 'やること',
        now,
      })

      expect(next.columns[0]).toMatchObject({ title: 'やること', updatedAt: now })
      expect(next.columns[1]).toBe(board.columns[1])
    })
  })

  describe('deleteColumn', () => {
    it('カラムを中のカードごと削除する', () => {
      const board = createBoard()
      const next = boardReducer(board, { type: 'deleteColumn', columnId: 'column-1' })

      expect(next.columns.map((column) => column.id)).toEqual(['column-2', 'column-3', 'column-4'])
      expect(findCard(next, 'card-1')).toBeUndefined()
    })
  })

  describe('addCard', () => {
    it('カラムの末尾に、最後の position + 1000 で追加する', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'addCard',
        id: 'new',
        columnId: 'column-1',
        title: '新しいカード',
        now,
      })

      expect(next.columns[0].cards.at(-1)).toEqual({
        id: 'new',
        columnId: 'column-1',
        title: '新しいカード',
        description: '',
        position: 4000,
        labelIds: [],
        dueDate: null,
        createdAt: now,
        updatedAt: now,
      })
    })

    it('空のカラムには position 1000 で追加する', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'addCard',
        id: 'new',
        columnId: 'column-4',
        title: '新しいカード',
        now,
      })

      expect(next.columns[3].cards).toHaveLength(1)
      expect(next.columns[3].cards[0].position).toBe(1000)
    })
  })

  describe('updateCard', () => {
    it('渡した項目だけを書き換える', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'updateCard',
        cardId: 'card-1',
        description: '説明を変更',
        now,
      })

      expect(findCard(next, 'card-1')).toMatchObject({
        title: 'useReducer でカードを追加できるようにする',
        description: '説明を変更',
        labelIds: ['label-1', 'label-2'],
        dueDate: '2026-11-05',
        updatedAt: now,
      })
    })

    it('dueDate を渡すと期限日を変え、null を渡すと消す', () => {
      const board = createBoard()
      const changed = boardReducer(board, {
        type: 'updateCard',
        cardId: 'card-1',
        dueDate: '2026-12-24',
        now,
      })
      expect(findCard(changed, 'card-1')?.dueDate).toBe('2026-12-24')

      const cleared = boardReducer(board, {
        type: 'updateCard',
        cardId: 'card-1',
        dueDate: null,
        now,
      })
      expect(findCard(cleared, 'card-1')?.dueDate).toBeNull()
    })

    it('labelIds を渡すと、付いているラベルを置き換える', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'updateCard',
        cardId: 'card-1',
        labelIds: ['label-2'],
        now,
      })

      expect(findCard(next, 'card-1')?.labelIds).toEqual(['label-2'])
    })

    it('カードを含まないカラムは同じオブジェクトのまま残す', () => {
      const board = createBoard()
      const next = boardReducer(board, { type: 'updateCard', cardId: 'card-1', title: '変更', now })

      expect(next.columns[0]).not.toBe(board.columns[0])
      expect(next.columns[1]).toBe(board.columns[1])
      expect(next.columns[2]).toBe(board.columns[2])
    })
  })

  describe('deleteLabel', () => {
    it('ボードのラベル一覧から消し、付けていたカードからも外す', () => {
      const board = createBoard()
      const next = boardReducer(board, { type: 'deleteLabel', labelId: 'label-1' })

      expect(next.labels.map((label) => label.id)).toEqual(['label-2'])
      expect(findCard(next, 'card-1')?.labelIds).toEqual(['label-2'])
      expect(findCard(next, 'card-2')?.labelIds).toEqual([])
      // ラベルを付けたカードがないカラムは、同じオブジェクトのまま残す
      expect(next.columns[1]).toBe(board.columns[1])
    })
  })

  describe('deleteCard', () => {
    it('カードを削除する', () => {
      const board = createBoard()
      const next = boardReducer(board, { type: 'deleteCard', cardId: 'card-2' })

      expect(next.columns[0].cards.map((card) => card.id)).toEqual(['card-1', 'card-3'])
    })
  })

  describe('moveCard', () => {
    const cardIds = (board: BoardDetail, columnIndex: number) =>
      board.columns[columnIndex].cards.map((card) => card.id)

    it('同じカラムの中で並び替える', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'moveCard',
        cardId: 'card-1',
        toColumnId: 'column-1',
        index: 2,
        now,
      })

      expect(cardIds(next, 0)).toEqual(['card-2', 'card-3', 'card-1'])
      expect(findCard(next, 'card-1')?.position).toBe(4000)
    })

    it('別のカラムのカードの間に移動する', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'moveCard',
        cardId: 'card-1',
        toColumnId: 'column-3',
        index: 1,
        now,
      })

      expect(cardIds(next, 0)).toEqual(['card-2', 'card-3'])
      expect(cardIds(next, 2)).toEqual(['card-5', 'card-1', 'card-6'])
      expect(findCard(next, 'card-1')).toMatchObject({
        columnId: 'column-3',
        position: 1500,
        updatedAt: now,
      })
      // 関係のないカラムは同じオブジェクトのまま
      expect(next.columns[1]).toBe(board.columns[1])
    })

    it('空のカラムに移動する', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'moveCard',
        cardId: 'card-2',
        toColumnId: 'column-4',
        index: 0,
        now,
      })

      expect(cardIds(next, 3)).toEqual(['card-2'])
      expect(findCard(next, 'card-2')?.position).toBe(1000)
    })

    it('同じ場所に落としたときは、元の state をそのまま返す', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'moveCard',
        cardId: 'card-2',
        toColumnId: 'column-1',
        index: 1,
        now,
      })

      expect(next).toBe(board)
    })
  })

  describe('moveColumn', () => {
    it('カラムを先頭に移動する', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'moveColumn',
        columnId: 'column-4',
        index: 0,
        now,
      })

      expect(next.columns.map((column) => column.id)).toEqual([
        'column-4',
        'column-1',
        'column-2',
        'column-3',
      ])
      expect(next.columns[0].position).toBe(500)
    })

    it('同じ場所に落としたときは、元の state をそのまま返す', () => {
      const board = createBoard()
      const next = boardReducer(board, {
        type: 'moveColumn',
        columnId: 'column-2',
        index: 1,
        now,
      })

      expect(next).toBe(board)
    })
  })
})
