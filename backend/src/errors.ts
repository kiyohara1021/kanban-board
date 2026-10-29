import type { ErrorCode } from '@kanban/shared'

type ErrorDetail = { path: string; message: string }

// HTTP のステータスコードと、レスポンスの error.code を持つエラー。
// services で throw すると、middlewares/errorHandler.ts が docs/03-api.md の形の JSON に変える
export class HttpError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly details?: ErrorDetail[]

  constructor(status: number, code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export class ValidationError extends HttpError {
  constructor(details: ErrorDetail[]) {
    super(400, 'VALIDATION_ERROR', '入力内容に誤りがあります', details)
  }
}

export class NotFoundError extends HttpError {
  constructor(what: string) {
    super(404, 'NOT_FOUND', `${what}が見つかりません`)
  }
}
