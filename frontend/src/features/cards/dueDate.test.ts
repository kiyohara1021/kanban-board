import { describe, expect, it } from 'vitest'
import { formatDueDate } from './dueDate'

describe('formatDueDate', () => {
  const today = '2026-11-05'

  it('今年の日付は、月と日だけにする', () => {
    expect(formatDueDate('2026-11-05', today)).toBe('11月5日')
    expect(formatDueDate('2026-01-09', today)).toBe('1月9日')
  })

  it('ほかの年の日付には、年も付ける', () => {
    expect(formatDueDate('2027-01-05', today)).toBe('2027年1月5日')
    expect(formatDueDate('2025-12-31', today)).toBe('2025年12月31日')
  })
})
