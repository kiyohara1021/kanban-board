import { beforeEach, describe, expect, it } from 'vitest'
import * as api from './api'
import { createSampleDb, type DemoDb } from './db'

// デモ版の API が、backend/test/api.test.ts と同じ規則で動くことを確かめる
let db: DemoDb

beforeEach(() => {
  db = { boards: [], columns: [], cards: [] }
})

const titlesOf = (items: { title: string }[]) => items.map((item) => item.title)

function errorOf(action: () => unknown) {
  try {
    action()
  } catch (error) {
    if (error instanceof api.DemoApiError) return { status: error.status, ...error.body.error }
  }
  throw new Error('DemoApiError が投げられなかった')
}

describe('デモ版の API', () => {
  it('サンプルのボードには、3カラムと6枚のカードがある', () => {
    const sample = createSampleDb()
    const detail = api.getBoardDetail(sample, sample.boards[0].id)

    expect(titlesOf(detail.columns)).toEqual(['ToDo', '進行中', '完了'])
    expect(detail.columns.flatMap((column) => column.cards)).toHaveLength(6)
  })

  it('ボードを作ると、3つのカラムが用意される', () => {
    const board = api.createBoard(db, { title: '  新しいボード  ' })

    expect(board.title).toBe('新しいボード')
    expect(titlesOf(api.getBoardDetail(db, board.id).columns)).toEqual(['ToDo', '進行中', '完了'])
  })

  it('入力が不正なときは、バックエンドと同じ形の 400 を返す', () => {
    expect(errorOf(() => api.createBoard(db, { title: '' }))).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '入力内容に誤りがあります',
      details: [{ path: 'title', message: '1文字以上で入力してください' }],
    })
  })

  it('存在しない ID には 404 を返す', () => {
    expect(errorOf(() => api.getBoardDetail(db, 'unknown'))).toMatchObject({
      status: 404,
      message: 'ボードが見つかりません',
    })
    expect(errorOf(() => api.deleteCard(db, 'unknown')).status).toBe(404)
  })

  it('カードを別のカラムのカードの間に移動する', () => {
    const board = api.createBoard(db, { title: 'B' })
    const [todo, doing] = api.getBoardDetail(db, board.id).columns
    const a = api.createCard(db, todo.id, { title: 'A' })
    api.createCard(db, doing.id, { title: 'X' })
    api.createCard(db, doing.id, { title: 'Y' })

    api.moveCard(db, a.id, { columnId: doing.id, index: 1 })

    const after = api.getBoardDetail(db, board.id)
    expect(titlesOf(after.columns[0].cards)).toEqual([])
    expect(titlesOf(after.columns[1].cards)).toEqual(['X', 'A', 'Y'])
  })

  it('別のボードのカラムには移動できない', () => {
    const board = api.createBoard(db, { title: 'B1' })
    const other = api.createBoard(db, { title: 'B2' })
    const card = api.createCard(db, api.getBoardDetail(db, board.id).columns[0].id, { title: 'A' })
    const otherColumnId = api.getBoardDetail(db, other.id).columns[0].id

    expect(
      errorOf(() => api.moveCard(db, card.id, { columnId: otherColumnId, index: 0 })),
    ).toMatchObject({
      status: 400,
      details: [{ path: 'columnId', message: '同じボードのカラムを指定してください' }],
    })
  })

  it('カラムを並び替える', () => {
    const board = api.createBoard(db, { title: 'B' })
    const done = api.getBoardDetail(db, board.id).columns[2]

    api.moveColumn(db, done.id, { index: 0 })

    expect(titlesOf(api.getBoardDetail(db, board.id).columns)).toEqual(['完了', 'ToDo', '進行中'])
  })

  it('ボードを削除すると、中のカラムとカードも消える', () => {
    const board = api.createBoard(db, { title: 'B' })
    const card = api.createCard(db, api.getBoardDetail(db, board.id).columns[0].id, { title: 'A' })

    api.deleteBoard(db, board.id)

    expect(db).toEqual({ boards: [], columns: [], cards: [] })
    expect(errorOf(() => api.getCard(db, card.id)).status).toBe(404)
  })
})
