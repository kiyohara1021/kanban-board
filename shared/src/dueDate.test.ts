import { describe, expect, it } from 'vitest'
import { isOverdue, toDateString } from './dueDate'

describe('toDateString', () => {
  it('その環境のタイムゾーンでの日付を YYYY-MM-DD で返す', () => {
    // new Date(年, 月, 日, ...) はその環境のタイムゾーンで作るので、どこで実行しても同じ日付になる
    expect(toDateString(new Date(2026, 10, 5, 0, 30))).toBe('2026-11-05')
    expect(toDateString(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05')
  })

  it('月と日が1桁のときは0で埋める', () => {
    expect(toDateString(new Date(2027, 0, 9))).toBe('2027-01-09')
  })
})

describe('isOverdue', () => {
  const today = '2026-11-05'

  it('期限日が今日より前なら期限切れ', () => {
    expect(isOverdue('2026-11-04', today)).toBe(true)
    expect(isOverdue('2025-12-31', today)).toBe(true)
  })

  it('期限日が今日なら、まだ期限切れにしない', () => {
    expect(isOverdue('2026-11-05', today)).toBe(false)
  })

  it('期限日が今日より後なら期限切れではない', () => {
    expect(isOverdue('2026-11-06', today)).toBe(false)
    expect(isOverdue('2027-01-01', today)).toBe(false)
  })

  it('期限日がなければ期限切れではない', () => {
    expect(isOverdue(null, today)).toBe(false)
  })
})
