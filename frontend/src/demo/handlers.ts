import { delay, http, HttpResponse, type PathParams } from 'msw'
import * as api from './api'
import { loadDb, saveDb, type DemoDb } from './db'

type Params = Record<string, string>
type Result = { status?: number; json?: unknown }

// 1つのエンドポイントの処理を、MSW のハンドラーに変える。
// localStorage から読み込み、処理し、保存して、バックエンドと同じ形のレスポンスを返す
function route(action: (db: DemoDb, params: Params, body: unknown) => Result) {
  return async ({ params, request }: { params: PathParams; request: Request }) => {
    // 本物のサーバーらしく少し待たせる。楽観的更新で画面が先に変わる様子が分かる。
    // 画面のテスト（Vitest では MODE が 'test'）では待たせず、テストを速く、安定させる
    await delay(import.meta.env.MODE === 'test' ? 0 : 150)

    let body: unknown
    if (request.method === 'POST' || request.method === 'PATCH') {
      try {
        body = await request.json()
      } catch {
        return HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'JSON の形式が正しくありません' } },
          { status: 400 },
        )
      }
    }

    const db = loadDb()
    try {
      // URL の :boardId などは1つの文字列なので、string として扱う
      const { status, json } = action(db, params as Params, body)
      saveDb(db)
      return json === undefined
        ? new HttpResponse(null, { status: status ?? 204 })
        : HttpResponse.json(json, { status: status ?? 200 })
    } catch (error) {
      if (error instanceof api.DemoApiError) {
        return HttpResponse.json(error.body, { status: error.status })
      }
      throw error
    }
  }
}

// docs/03-api.md のエンドポイント
export const handlers = [
  http.get(
    '/api/boards',
    route((db) => ({ json: api.listBoards(db) })),
  ),
  http.post(
    '/api/boards',
    route((db, _p, body) => ({ status: 201, json: api.createBoard(db, body) })),
  ),
  http.get(
    '/api/boards/:boardId',
    route((db, p) => ({ json: api.getBoardDetail(db, p.boardId) })),
  ),
  http.patch(
    '/api/boards/:boardId',
    route((db, p, body) => ({ json: api.updateBoard(db, p.boardId, body) })),
  ),
  http.delete(
    '/api/boards/:boardId',
    route((db, p) => {
      api.deleteBoard(db, p.boardId)
      return {}
    }),
  ),
  http.post(
    '/api/boards/:boardId/columns',
    route((db, p, body) => ({ status: 201, json: api.createColumn(db, p.boardId, body) })),
  ),

  http.patch(
    '/api/columns/:columnId',
    route((db, p, body) => ({ json: api.updateColumn(db, p.columnId, body) })),
  ),
  http.post(
    '/api/columns/:columnId/move',
    route((db, p, body) => ({ json: api.moveColumn(db, p.columnId, body) })),
  ),
  http.delete(
    '/api/columns/:columnId',
    route((db, p) => {
      api.deleteColumn(db, p.columnId)
      return {}
    }),
  ),
  http.post(
    '/api/columns/:columnId/cards',
    route((db, p, body) => ({ status: 201, json: api.createCard(db, p.columnId, body) })),
  ),

  http.get(
    '/api/cards/:cardId',
    route((db, p) => ({ json: api.getCard(db, p.cardId) })),
  ),
  http.patch(
    '/api/cards/:cardId',
    route((db, p, body) => ({ json: api.updateCard(db, p.cardId, body) })),
  ),
  http.post(
    '/api/cards/:cardId/move',
    route((db, p, body) => ({ json: api.moveCard(db, p.cardId, body) })),
  ),
  http.delete(
    '/api/cards/:cardId',
    route((db, p) => {
      api.deleteCard(db, p.cardId)
      return {}
    }),
  ),
]
