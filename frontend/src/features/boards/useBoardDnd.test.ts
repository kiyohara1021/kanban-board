import { arrayMove } from '@dnd-kit/sortable'
import type { BoardDetail, Card } from '@kanban/shared'
import { describe, expect, it } from 'vitest'
import { matchesCardFilter, type CardFilter } from '@/features/cards/cardFilter'
import { boardReducer } from './boardReducer'
import { cardDropIndex } from './useBoardDnd'

const now = '2026-11-01T00:00:00.000Z'

function createCard(id: string, position: number, labelIds: string[]): Card {
  const card = { id, columnId: 'column-1', title: id, description: '' }
  return { ...card, position, labelIds, createdAt: now, updatedAt: now }
}

// A・B・C には「急ぎ」のラベルが付いていて、x と y には付いていない。
// 「急ぎ」で絞り込むと、画面には A・B・C だけが表示される
const board: BoardDetail = {
  id: 'board-1',
  title: 'マイボード',
  labels: [],
  createdAt: now,
  updatedAt: now,
  columns: [
    {
      id: 'column-1',
      boardId: 'board-1',
      title: 'ToDo',
      position: 1000,
      createdAt: now,
      updatedAt: now,
      cards: [
        createCard('A', 1000, ['urgent']),
        createCard('x', 2000, []),
        createCard('B', 3000, ['urgent']),
        createCard('y', 4000, []),
        createCard('C', 5000, ['urgent']),
      ],
    },
  ],
}
const filter: CardFilter = { text: '', labelIds: ['urgent'] }

// activeId のカードを overId のカードの上に落としたあとの、カラムの並び（すべてと、表示しているもの）
function drop(activeId: string, overId: string) {
  const cards = board.columns[0]!.cards
  const index = cardDropIndex(cards, activeId, overId)
  const next = boardReducer(board, {
    type: 'moveCard',
    cardId: activeId,
    toColumnId: 'column-1',
    index,
    now,
  })
  const nextCards = next.columns[0]!.cards
  return {
    all: nextCards.map((card) => card.id),
    shown: nextCards.filter((card) => matchesCardFilter(card, filter)).map((card) => card.id),
  }
}

// ドラッグ中に dnd-kit が画面で見せている並び（表示しているカードだけを並び替えたもの）
function shownWhileDragging(activeId: string, overId: string) {
  const shown = ['A', 'B', 'C']
  return arrayMove(shown, shown.indexOf(activeId), shown.indexOf(overId))
}

describe('cardDropIndex（絞り込みでカードを隠しているとき）', () => {
  it('下へ動かすと、重ねたカードの直後に入り、表示していた並びのとおりに保存される', () => {
    expect(drop('A', 'C')).toEqual({ all: ['x', 'B', 'y', 'C', 'A'], shown: ['B', 'C', 'A'] })
    expect(drop('A', 'C').shown).toEqual(shownWhileDragging('A', 'C'))

    expect(drop('A', 'B')).toEqual({ all: ['x', 'B', 'A', 'y', 'C'], shown: ['B', 'A', 'C'] })
    expect(drop('A', 'B').shown).toEqual(shownWhileDragging('A', 'B'))
  })

  it('上へ動かすと、重ねたカードの直前に入る', () => {
    expect(drop('C', 'A')).toEqual({ all: ['C', 'A', 'x', 'B', 'y'], shown: ['C', 'A', 'B'] })
    expect(drop('C', 'A').shown).toEqual(shownWhileDragging('C', 'A'))

    expect(drop('C', 'B')).toEqual({ all: ['A', 'x', 'C', 'B', 'y'], shown: ['A', 'C', 'B'] })
    expect(drop('C', 'B').shown).toEqual(shownWhileDragging('C', 'B'))
  })

  it('表示しているカードだけで数えた index を使うと、位置がずれる（このテストで防いでいる不具合）', () => {
    // 表示している並び A・B・C で、A を C に重ねると index は 2。
    // これをそのまま使うと、隠れている x と y を含めた並びの 2 番目（B の直後）に入ってしまう
    const next = boardReducer(board, {
      type: 'moveCard',
      cardId: 'A',
      toColumnId: 'column-1',
      index: 2,
      now,
    })
    const shown = next.columns[0]!.cards.filter((card) => matchesCardFilter(card, filter))
    expect(shown.map((card) => card.id)).toEqual(['B', 'A', 'C'])
    expect(shown.map((card) => card.id)).not.toEqual(shownWhileDragging('A', 'C'))
  })

  it('カードのない場所に落としたときは、今の位置のまま', () => {
    expect(cardDropIndex(board.columns[0]!.cards, 'B', 'column-1')).toBe(2)
  })
})
