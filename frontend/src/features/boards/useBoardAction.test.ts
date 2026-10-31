import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BoardAction } from './boardReducer'
import { sendAction } from './useBoardAction'

const now = '2026-11-01T00:00:00.000Z'

afterEach(() => {
  vi.unstubAllGlobals()
})

// アクションを送ったときに、どの URL・メソッド・ボディで fetch が呼ばれるかを調べる
async function requestOf(action: BoardAction) {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  await sendAction('board-1', action)

  const [url, init] = fetchMock.mock.calls[0]
  return { url, method: init.method, body: init.body && JSON.parse(init.body) }
}

describe('sendAction', () => {
  it.each<[string, BoardAction, { url: string; method: string; body?: unknown }]>([
    [
      'カラムの追加',
      { type: 'addColumn', id: 'tmp', title: 'レビュー', now },
      { url: '/api/boards/board-1/columns', method: 'POST', body: { title: 'レビュー' } },
    ],
    [
      'カラムの並び替え',
      { type: 'moveColumn', columnId: 'c1', index: 0, now },
      { url: '/api/columns/c1/move', method: 'POST', body: { index: 0 } },
    ],
    [
      'カードの追加',
      { type: 'addCard', id: 'tmp', columnId: 'c1', title: 'A', now },
      { url: '/api/columns/c1/cards', method: 'POST', body: { title: 'A', description: '' } },
    ],
    [
      'カードの移動',
      { type: 'moveCard', cardId: 'k1', toColumnId: 'c2', index: 1, now },
      { url: '/api/cards/k1/move', method: 'POST', body: { columnId: 'c2', index: 1 } },
    ],
    [
      'カードの削除',
      { type: 'deleteCard', cardId: 'k1' },
      { url: '/api/cards/k1', method: 'DELETE' },
    ],
    [
      'ラベルの削除',
      { type: 'deleteLabel', labelId: 'l1' },
      { url: '/api/labels/l1', method: 'DELETE' },
    ],
  ])('%s', async (_name, action, expected) => {
    expect(await requestOf(action)).toEqual({ body: undefined, ...expected })
  })

  it('カードの更新では、送られた項目だけをボディに入れる', async () => {
    const request = await requestOf({ type: 'updateCard', cardId: 'k1', title: '新', now })
    expect(request).toEqual({ url: '/api/cards/k1', method: 'PATCH', body: { title: '新' } })
  })

  it('カードのラベルを変えるときは、付けた後の ID をすべて送る', async () => {
    const request = await requestOf({
      type: 'updateCard',
      cardId: 'k1',
      labelIds: ['l1', 'l2'],
      now,
    })
    expect(request.body).toEqual({ labelIds: ['l1', 'l2'] })
  })
})
