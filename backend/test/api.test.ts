import type { BoardDetail, Card, Column, Label } from '@kanban/shared'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { prisma } from '../src/lib/prisma'

// サーバーを起動せず、app に直接リクエストを送る
const api = request(app)

beforeEach(async () => {
  await prisma.board.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

// ---- テスト用のヘルパー ----

async function createBoard(title = 'テストボード'): Promise<BoardDetail> {
  const created = await api.post('/api/boards').send({ title }).expect(201)
  return getBoard(created.body.id)
}

async function getBoard(boardId: string): Promise<BoardDetail> {
  const res = await api.get(`/api/boards/${boardId}`).expect(200)
  return res.body
}

async function addCard(columnId: string, title: string): Promise<Card> {
  const res = await api.post(`/api/columns/${columnId}/cards`).send({ title }).expect(201)
  return res.body
}

async function addLabel(boardId: string, name: string, color = 'blue'): Promise<Label> {
  const res = await api.post(`/api/boards/${boardId}/labels`).send({ name, color }).expect(201)
  return res.body
}

const titlesOf = (items: { title: string }[]) => items.map((item) => item.title)

// ---- ボード ----

describe('ボード', () => {
  it('作成すると、ToDo・進行中・完了の3カラムが用意される', async () => {
    const board = await createBoard()

    expect(titlesOf(board.columns)).toEqual(['ToDo', '進行中', '完了'])
    expect(board.columns.map((column) => column.position)).toEqual([1000, 2000, 3000])
  })

  it('タイトルの前後の空白は取り除いて保存する', async () => {
    const res = await api.post('/api/boards').send({ title: '  仕事  ' }).expect(201)
    expect(res.body.title).toBe('仕事')
  })

  it('一覧を取得できる', async () => {
    await createBoard('A')
    const res = await api.get('/api/boards').expect(200)

    expect(titlesOf(res.body)).toEqual(['A'])
    expect(res.body[0]).not.toHaveProperty('columns')
  })

  it('タイトルを変更できる', async () => {
    const board = await createBoard()
    const res = await api.patch(`/api/boards/${board.id}`).send({ title: '新しい名前' }).expect(200)
    expect(res.body.title).toBe('新しい名前')
  })

  it('削除すると、中のカラムとカードも消える', async () => {
    const board = await createBoard()
    const card = await addCard(board.columns[0].id, 'カード')

    await api.delete(`/api/boards/${board.id}`).expect(204)

    await api.get(`/api/boards/${board.id}`).expect(404)
    await api.get(`/api/cards/${card.id}`).expect(404)
  })
})

// ---- エラー ----

describe('エラー', () => {
  it('入力が不正なときは 400 と項目ごとのメッセージを返す', async () => {
    const res = await api.post('/api/boards').send({ title: '   ' }).expect(400)

    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力内容に誤りがあります',
        details: [{ path: 'title', message: '1文字以上で入力してください' }],
      },
    })
  })

  it('JSON として読めないボディには 400 を返す', async () => {
    const res = await api
      .post('/api/boards')
      .set('Content-Type', 'application/json')
      .send('{ title: ')
      .expect(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('存在しない ID には 404 を返す', async () => {
    const res = await api.get('/api/boards/unknown').expect(404)
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'ボードが見つかりません' })

    await api.patch('/api/cards/unknown').send({ title: 'x' }).expect(404)
    await api.delete('/api/columns/unknown').expect(404)
    await api.post('/api/columns/unknown/cards').send({ title: 'x' }).expect(404)
  })

  it('存在しない URL には 404 を返す', async () => {
    const res = await api.get('/api/unknown').expect(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

// ---- カラム ----

describe('カラム', () => {
  it('末尾に追加する', async () => {
    const board = await createBoard()
    const res = await api
      .post(`/api/boards/${board.id}/columns`)
      .send({ title: 'レビュー' })
      .expect(201)

    expect(res.body).toMatchObject({ boardId: board.id, title: 'レビュー', position: 4000 })
  })

  it('並び替える', async () => {
    const board = await createBoard()
    const done = board.columns[2]

    const res = await api.post(`/api/columns/${done.id}/move`).send({ index: 0 }).expect(200)

    expect((res.body as Column).position).toBe(500)
    expect(titlesOf((await getBoard(board.id)).columns)).toEqual(['完了', 'ToDo', '進行中'])
  })

  it('名前を変更し、削除できる', async () => {
    const board = await createBoard()
    const todo = board.columns[0]
    const card = await addCard(todo.id, 'カード')

    await api.patch(`/api/columns/${todo.id}`).send({ title: 'やること' }).expect(200)
    await api.delete(`/api/columns/${todo.id}`).expect(204)

    expect(titlesOf((await getBoard(board.id)).columns)).toEqual(['進行中', '完了'])
    await api.get(`/api/cards/${card.id}`).expect(404)
  })
})

// ---- カード ----

describe('カード', () => {
  it('末尾に追加する。説明を省略すると空文字になる', async () => {
    const board = await createBoard()
    const first = await addCard(board.columns[0].id, '1枚目')
    const second = await addCard(board.columns[0].id, '2枚目')

    expect(first).toMatchObject({ title: '1枚目', description: '', position: 1000, labelIds: [] })
    expect(second.position).toBe(2000)
  })

  it('送った項目だけを変更する', async () => {
    const board = await createBoard()
    const card = await addCard(board.columns[0].id, 'タイトル')

    const res = await api.patch(`/api/cards/${card.id}`).send({ description: '説明' }).expect(200)

    expect(res.body).toMatchObject({ title: 'タイトル', description: '説明' })
  })

  it('同じカラムの中で並び替える', async () => {
    const board = await createBoard()
    const todo = board.columns[0]
    const a = await addCard(todo.id, 'A')
    await addCard(todo.id, 'B')
    await addCard(todo.id, 'C')

    await api.post(`/api/cards/${a.id}/move`).send({ columnId: todo.id, index: 2 }).expect(200)

    expect(titlesOf((await getBoard(board.id)).columns[0].cards)).toEqual(['B', 'C', 'A'])
  })

  it('別のカラムのカードの間に移動する', async () => {
    const board = await createBoard()
    const [todo, doing] = board.columns
    const a = await addCard(todo.id, 'A')
    await addCard(doing.id, 'X')
    await addCard(doing.id, 'Y')

    const res = await api
      .post(`/api/cards/${a.id}/move`)
      .send({ columnId: doing.id, index: 1 })
      .expect(200)

    expect(res.body).toMatchObject({ columnId: doing.id, position: 1500 })
    const after = await getBoard(board.id)
    expect(titlesOf(after.columns[0].cards)).toEqual([])
    expect(titlesOf(after.columns[1].cards)).toEqual(['X', 'A', 'Y'])
  })

  it('空のカラムに移動する', async () => {
    const board = await createBoard()
    const [todo, , done] = board.columns
    const a = await addCard(todo.id, 'A')

    const res = await api
      .post(`/api/cards/${a.id}/move`)
      .send({ columnId: done.id, index: 0 })
      .expect(200)

    expect(res.body).toMatchObject({ columnId: done.id, position: 1000 })
  })

  it('隙間が狭すぎるときは、カラムのカードの position を振り直す', async () => {
    const board = await createBoard()
    const todo = board.columns[0]
    const a = await addCard(todo.id, 'A')
    const b = await addCard(todo.id, 'B')
    const c = await addCard(todo.id, 'C')
    // A と B の間を、ほとんど隙間のない状態にしておく
    await prisma.card.update({ where: { id: b.id }, data: { position: 1000.0005 } })

    await api.post(`/api/cards/${c.id}/move`).send({ columnId: todo.id, index: 1 }).expect(200)

    const cards = (await getBoard(board.id)).columns[0].cards
    expect(titlesOf(cards)).toEqual(['A', 'C', 'B'])
    expect(cards.map((card) => card.position)).toEqual([1000, 2000, 3000])
    expect(cards[0].id).toBe(a.id)
  })

  it('別のボードのカラムには移動できない', async () => {
    const board = await createBoard('ボード1')
    const other = await createBoard('ボード2')
    const card = await addCard(board.columns[0].id, 'A')

    const res = await api
      .post(`/api/cards/${card.id}/move`)
      .send({ columnId: other.columns[0].id, index: 0 })
      .expect(400)

    expect(res.body.error.details).toEqual([
      { path: 'columnId', message: '同じボードのカラムを指定してください' },
    ])
  })

  it('index が負の数なら 400 を返す', async () => {
    const board = await createBoard()
    const card = await addCard(board.columns[0].id, 'A')

    const res = await api
      .post(`/api/cards/${card.id}/move`)
      .send({ columnId: board.columns[0].id, index: -1 })
      .expect(400)

    expect(res.body.error.details[0].path).toBe('index')
  })
})

// ---- ラベル ----

describe('ラベル', () => {
  it('作成すると、ボード詳細に作った順で入る', async () => {
    const board = await createBoard()

    const label = await addLabel(board.id, '  急ぎ  ', 'red')
    await addLabel(board.id, '後で', 'green')

    expect(label).toMatchObject({ boardId: board.id, name: '急ぎ', color: 'red' })
    const after = await getBoard(board.id)
    expect(after.labels.map((l) => l.name)).toEqual(['急ぎ', '後で'])
  })

  it('決められた色以外は 400 を返す', async () => {
    const board = await createBoard()

    const res = await api
      .post(`/api/boards/${board.id}/labels`)
      .send({ name: '急ぎ', color: 'pink' })
      .expect(400)

    expect(res.body.error.details[0]).toEqual({
      path: 'color',
      message: '決められた色から選んでください',
    })
  })

  it('存在しないボードには作れない', async () => {
    await api.post('/api/boards/unknown/labels').send({ name: '急ぎ', color: 'red' }).expect(404)
  })

  it('カードに付けると、送った ID の組に置き換わる', async () => {
    const board = await createBoard()
    const card = await addCard(board.columns[0].id, 'A')
    const urgent = await addLabel(board.id, '急ぎ')
    const later = await addLabel(board.id, '後で')

    await api
      .patch(`/api/cards/${card.id}`)
      .send({ labelIds: [urgent.id, later.id] })
      .expect(200)
    // 重なった ID は1つにまとめる
    const res = await api
      .patch(`/api/cards/${card.id}`)
      .send({ labelIds: [later.id, later.id] })
      .expect(200)

    expect(res.body.labelIds).toEqual([later.id])
    expect((await getBoard(board.id)).columns[0].cards[0].labelIds).toEqual([later.id])
  })

  it('labelIds を送らなければ、付いているラベルは変えない', async () => {
    const board = await createBoard()
    const card = await addCard(board.columns[0].id, 'A')
    const label = await addLabel(board.id, '急ぎ')
    await api
      .patch(`/api/cards/${card.id}`)
      .send({ labelIds: [label.id] })
      .expect(200)

    const res = await api.patch(`/api/cards/${card.id}`).send({ title: 'B' }).expect(200)

    expect(res.body).toMatchObject({ title: 'B', labelIds: [label.id] })
  })

  it('移動しても、付いているラベルはそのまま', async () => {
    const board = await createBoard()
    const card = await addCard(board.columns[0].id, 'A')
    const label = await addLabel(board.id, '急ぎ')
    await api
      .patch(`/api/cards/${card.id}`)
      .send({ labelIds: [label.id] })
      .expect(200)

    const res = await api
      .post(`/api/cards/${card.id}/move`)
      .send({ columnId: board.columns[1].id, index: 0 })
      .expect(200)

    expect(res.body.labelIds).toEqual([label.id])
  })

  it('ほかのボードのラベルや、存在しないラベルは付けられない', async () => {
    const board = await createBoard('ボード1')
    const other = await createBoard('ボード2')
    const card = await addCard(board.columns[0].id, 'A')
    const otherLabel = await addLabel(other.id, '急ぎ')

    for (const labelIds of [[otherLabel.id], ['unknown']]) {
      const res = await api.patch(`/api/cards/${card.id}`).send({ labelIds }).expect(400)
      expect(res.body.error.details).toEqual([
        { path: 'labelIds', message: '同じボードのラベルを指定してください' },
      ])
    }
    expect((await getBoard(board.id)).columns[0].cards[0].labelIds).toEqual([])
  })

  it('削除すると、付けていたカードからも外れる', async () => {
    const board = await createBoard()
    const card = await addCard(board.columns[0].id, 'A')
    const label = await addLabel(board.id, '急ぎ')
    await api
      .patch(`/api/cards/${card.id}`)
      .send({ labelIds: [label.id] })
      .expect(200)

    await api.delete(`/api/labels/${label.id}`).expect(204)

    const after = await getBoard(board.id)
    expect(after.labels).toEqual([])
    expect(after.columns[0].cards[0].labelIds).toEqual([])
    await api.delete(`/api/labels/${label.id}`).expect(404)
  })
})
