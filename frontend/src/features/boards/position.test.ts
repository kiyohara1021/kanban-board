import { describe, expect, it } from 'vitest'
import { positionForInsert } from './position'

const items = (...positions: number[]) => positions.map((position) => ({ position }))

describe('positionForInsert', () => {
  it('空の並びには 1000 を返す', () => {
    expect(positionForInsert([], 0).position).toBe(1000)
  })

  it('末尾には最後の position + 1000 を返す', () => {
    expect(positionForInsert(items(1000, 2000), 2).position).toBe(3000)
  })

  it('先頭には最初の position の半分を返す', () => {
    expect(positionForInsert(items(1000, 2000), 0).position).toBe(500)
  })

  it('間には前後の中間を返す', () => {
    expect(positionForInsert(items(1000, 2000), 1).position).toBe(1500)
  })

  it('隙間が十分あるときは items をそのまま返す', () => {
    const original = items(1000, 2000)
    expect(positionForInsert(original, 1).items).toBe(original)
  })

  it('隙間が狭すぎるときは、挿入場所を空けて 1000 刻みに振り直す', () => {
    const result = positionForInsert(items(1000, 1000.0001, 3000), 1)

    expect(result.position).toBe(2000)
    expect(result.items.map((item) => item.position)).toEqual([1000, 3000, 4000])
  })
})
