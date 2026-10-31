import type { Card } from '@kanban/shared'
import { describe, expect, it } from 'vitest'
import { emptyCardFilter, isFiltering, matchesCardFilter } from './cardFilter'

const now = '2026-11-01T00:00:00.000Z'

function createCard(changes: Partial<Card>): Card {
  return {
    id: 'card-1',
    columnId: 'column-1',
    title: '',
    description: '',
    position: 1000,
    labelIds: [],
    createdAt: now,
    updatedAt: now,
    ...changes,
  }
}

const card = createCard({
  title: 'React でボードを作る',
  description: 'useReducer を使う',
  labelIds: ['label-1'],
})

describe('matchesCardFilter', () => {
  it('条件がなければ、すべてのカードが合う', () => {
    expect(matchesCardFilter(card, emptyCardFilter)).toBe(true)
  })

  it('タイトルと説明の両方から探す', () => {
    expect(matchesCardFilter(card, { text: 'ボード', labelIds: [] })).toBe(true)
    expect(matchesCardFilter(card, { text: 'useReducer', labelIds: [] })).toBe(true)
    expect(matchesCardFilter(card, { text: 'API', labelIds: [] })).toBe(false)
  })

  it('大文字と小文字、全角と半角を区別しない', () => {
    expect(matchesCardFilter(card, { text: 'react', labelIds: [] })).toBe(true)
    expect(matchesCardFilter(card, { text: 'ＲＥＡＣＴ', labelIds: [] })).toBe(true)
    expect(matchesCardFilter(card, { text: 'USEREDUCER', labelIds: [] })).toBe(true)
  })

  it('空白で区切ると、すべての語を含むカードだけが合う', () => {
    expect(matchesCardFilter(card, { text: 'react 使う', labelIds: [] })).toBe(true)
    // 全角の空白でも区切る
    expect(matchesCardFilter(card, { text: 'react　使う', labelIds: [] })).toBe(true)
    expect(matchesCardFilter(card, { text: 'react API', labelIds: [] })).toBe(false)
  })

  it('タイトルの終わりと説明の始まりをつなげて探さない', () => {
    // 「作る」と「use」がつながった「作るuse」では見つからない
    expect(matchesCardFilter(card, { text: '作るuse', labelIds: [] })).toBe(false)
  })

  it('選んだラベルのどれか1つが付いていれば合う', () => {
    expect(matchesCardFilter(card, { text: '', labelIds: ['label-1'] })).toBe(true)
    expect(matchesCardFilter(card, { text: '', labelIds: ['label-2', 'label-1'] })).toBe(true)
    expect(matchesCardFilter(card, { text: '', labelIds: ['label-2'] })).toBe(false)
  })

  it('文字とラベルの両方を指定したら、両方に合うものだけ', () => {
    expect(matchesCardFilter(card, { text: 'react', labelIds: ['label-1'] })).toBe(true)
    expect(matchesCardFilter(card, { text: 'react', labelIds: ['label-2'] })).toBe(false)
    expect(matchesCardFilter(card, { text: 'API', labelIds: ['label-1'] })).toBe(false)
  })
})

describe('isFiltering', () => {
  it('空白だけの文字は、条件がないのと同じ', () => {
    expect(isFiltering(emptyCardFilter)).toBe(false)
    expect(isFiltering({ text: ' 　', labelIds: [] })).toBe(false)
  })

  it('文字かラベルのどちらかがあれば、絞り込み中', () => {
    expect(isFiltering({ text: 'react', labelIds: [] })).toBe(true)
    expect(isFiltering({ text: '', labelIds: ['label-1'] })).toBe(true)
  })
})
