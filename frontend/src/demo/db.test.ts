import { describe, expect, it } from 'vitest'
import { emptyDb, loadDb } from './db'

describe('デモ版の DB', () => {
  it('ラベルを足す前に保存されたデータも、ラベルが空の状態で読み込める', () => {
    // ラベルの機能を入れる前のデモ版は、3つのテーブルだけを保存していた
    const board = { id: 'b1', title: 'B', createdAt: '', updatedAt: '' }
    localStorage.setItem(
      'kanban-board-demo:v1',
      JSON.stringify({ boards: [board], columns: [], cards: [] }),
    )

    expect(loadDb()).toEqual({ ...emptyDb(), boards: [board] })
  })
})
