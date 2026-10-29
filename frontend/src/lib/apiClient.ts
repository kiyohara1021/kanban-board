import type { ErrorCode, ErrorResponse } from '@kanban/shared'

// API が返したエラー。message はサーバーが作った日本語のメッセージで、そのまま画面に出せる
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly details: ErrorResponse['error']['details']

  constructor(status: number, body: ErrorResponse | null) {
    super(body?.error.message ?? `通信に失敗しました（${status}）`)
    this.status = status
    this.code = body?.error.code ?? 'INTERNAL_ERROR'
    this.details = body?.error.details
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

// fetch の共通処理。ベース URL（/api）、JSON への変換、エラーの変換をまとめる。
// 開発中は Vite のプロキシが /api をバックエンド（3000 番）に転送する
export async function apiFetch<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // サーバーが起動していないなど、そもそもつながらなかった
    throw new Error('サーバーに接続できませんでした')
  }

  if (response.status === 204) return undefined as T

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, data as ErrorResponse | null)
  return data as T
}
