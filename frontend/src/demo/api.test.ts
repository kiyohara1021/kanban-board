import { isOverdue, toDateString } from '@kanban/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import * as api from './api'
import { createSampleDb, emptyDb, type DemoDb } from './db'

// デモ版の API が、backend/test/api.test.ts と同じ規則で動くことを確かめる
let db: DemoDb

beforeEach(() => {
  db = emptyDb()
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
  it('サンプルのボードには、3カラムと6枚のカードと3つのラベルがある', () => {
    const sample = createSampleDb()
    const detail = api.getBoardDetail(sample, sample.boards[0].id)

    expect(titlesOf(detail.columns)).toEqual(['ToDo', '進行中', '完了'])
    expect(detail.columns.flatMap((column) => column.cards)).toHaveLength(6)
    expect(detail.labels.map((label) => label.name)).toEqual([
      'フロントエンド',
      'バックエンド',
      '設計',
    ])
    expect(detail.columns[0].cards[1].labelIds).toHaveLength(2)
    // 期限日は作った日を基準にするので、期限切れのカードとまだ先のカードが必ずある
    const today = toDateString(new Date())
    const dueDates = detail.columns.flatMap((column) => column.cards).map((card) => card.dueDate)
    expect(dueDates.filter((dueDate) => isOverdue(dueDate, today))).toHaveLength(1)
    expect(dueDates.filter((dueDate) => dueDate !== null && dueDate > today)).toHaveLength(2)
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

  it('ボードを削除すると、中のカラム・カード・ラベルも消える', () => {
    const board = api.createBoard(db, { title: 'B' })
    const card = api.createCard(db, api.getBoardDetail(db, board.id).columns[0].id, { title: 'A' })
    const label = api.createLabel(db, board.id, { name: '急ぎ', color: 'red' })
    api.updateCard(db, card.id, { labelIds: [label.id] })

    api.deleteBoard(db, board.id)

    expect(db).toEqual(emptyDb())
    expect(errorOf(() => api.getCard(db, card.id)).status).toBe(404)
  })

  it('ラベルを作り、カードに付ける。重なった ID は1つにまとめる', () => {
    const board = api.createBoard(db, { title: 'B' })
    const card = api.createCard(db, api.getBoardDetail(db, board.id).columns[0].id, { title: 'A' })
    const label = api.createLabel(db, board.id, { name: '  急ぎ  ', color: 'red' })

    const updated = api.updateCard(db, card.id, { labelIds: [label.id, label.id] })

    expect(label).toMatchObject({ name: '急ぎ', color: 'red' })
    expect(updated.labelIds).toEqual([label.id])
    // labelIds を送らなければ変えない。移動しても外れない
    api.updateCard(db, card.id, { title: 'B' })
    const [, doing] = api.getBoardDetail(db, board.id).columns
    expect(api.moveCard(db, card.id, { columnId: doing.id, index: 0 }).labelIds).toEqual([label.id])
  })

  it('ほかのボードのラベルは付けられない。決められた色以外では作れない', () => {
    const board = api.createBoard(db, { title: 'B1' })
    const other = api.createBoard(db, { title: 'B2' })
    const card = api.createCard(db, api.getBoardDetail(db, board.id).columns[0].id, { title: 'A' })
    const otherLabel = api.createLabel(db, other.id, { name: '急ぎ', color: 'red' })

    expect(errorOf(() => api.updateCard(db, card.id, { labelIds: [otherLabel.id] }))).toMatchObject(
      {
        status: 400,
        details: [{ path: 'labelIds', message: '同じボードのラベルを指定してください' }],
      },
    )
    expect(
      errorOf(() => api.createLabel(db, board.id, { name: '急ぎ', color: 'pink' })),
    ).toMatchObject({
      status: 400,
      details: [{ path: 'color', message: '決められた色から選んでください' }],
    })
  })

  it('ラベルを削除すると、付けていたカードからも外れる', () => {
    const board = api.createBoard(db, { title: 'B' })
    const card = api.createCard(db, api.getBoardDetail(db, board.id).columns[0].id, { title: 'A' })
    const label = api.createLabel(db, board.id, { name: '急ぎ', color: 'red' })
    api.updateCard(db, card.id, { labelIds: [label.id] })

    api.deleteLabel(db, label.id)

    expect(api.getBoardDetail(db, board.id).labels).toEqual([])
    expect(api.getCard(db, card.id).labelIds).toEqual([])
    expect(errorOf(() => api.deleteLabel(db, label.id)).status).toBe(404)
  })

  it('期限日を設定・消去する。送らなければ変えず、存在しない日付は 400 を返す', () => {
    const board = api.createBoard(db, { title: 'B' })
    const card = api.createCard(db, api.getBoardDetail(db, board.id).columns[0].id, { title: 'A' })
    expect(card.dueDate).toBeNull()

    expect(api.updateCard(db, card.id, { dueDate: '2026-11-05' }).dueDate).toBe('2026-11-05')
    expect(api.updateCard(db, card.id, { title: 'B' }).dueDate).toBe('2026-11-05')
    expect(errorOf(() => api.updateCard(db, card.id, { dueDate: '2026-02-30' }))).toMatchObject({
      status: 400,
      details: [{ path: 'dueDate', message: 'YYYY-MM-DD の形の、実在する日付で指定してください' }],
    })
    expect(api.updateCard(db, card.id, { dueDate: null }).dueDate).toBeNull()
  })
})
