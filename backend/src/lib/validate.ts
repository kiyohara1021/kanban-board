import type { z } from 'zod'
import { ValidationError } from '../errors'

// リクエストボディを shared の Zod スキーマで検証し、型の付いた値を返す。
// 前後の空白の除去や初期値（description の '' など）も、スキーマのとおりに適用される
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body ?? {})
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    )
  }
  return result.data
}
