import type { ErrorResponse } from '@kanban/shared'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { Prisma } from '../../prisma/generated/client'
import { HttpError } from '../errors'

// どのルートにも当てはまらない URL
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'API が見つかりません' },
  } satisfies ErrorResponse)
}

// Express 5 は async 関数の中で throw されたエラーもここに渡してくれる（4.x では try/catch が必要だった）
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    } satisfies ErrorResponse)
    return
  }

  // 更新・削除しようとしたデータがない（Prisma のエラーコード P2025）
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'データが見つかりません' },
    } satisfies ErrorResponse)
    return
  }

  // リクエストボディが JSON として読めない
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'JSON の形式が正しくありません' },
    } satisfies ErrorResponse)
    return
  }

  console.error(error)
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'サーバーでエラーが発生しました' },
  } satisfies ErrorResponse)
}
