import { POSITION_GAP, type Board, type Card, type Column } from '@kanban/shared'

// デモ版（GitHub Pages）の「DB」。バックエンドの3つのテーブルと同じ形で、ブラウザの localStorage に保存する。
// 訪れた人ごとにブラウザの中にデータがあるので、ほかの人のデータを壊すことはない
export type DemoDb = {
  boards: Board[]
  columns: Column[]
  cards: Card[]
}

const STORAGE_KEY = 'kanban-board-demo:v1'

export function loadDb(): DemoDb {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as DemoDb
  } catch {
    // 保存できない環境（プライベートブラウズなど）や壊れたデータのときは、サンプルから始める
  }
  return createSampleDb()
}

export function saveDb(db: DemoDb) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // 保存できなくても、このページを開いている間は動かせる
  }
}

export function resetDb() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 何もしない
  }
}

// backend/prisma/seed.ts と同じ内容のサンプル
const sample: { title: string; cards: { title: string; description?: string }[] }[] = [
  {
    title: 'ToDo',
    cards: [
      {
        title: 'TanStack Query で API とつなぐ',
        description: 'Step 5。useQuery でボードを取得する。',
      },
      {
        title: 'カード詳細を URL で開けるようにする',
        description: 'Step 6。React Router を使う。',
      },
    ],
  },
  {
    title: '進行中',
    cards: [
      {
        title: 'バックエンド API を作る',
        description: 'Step 4。docs/03-api.md のエンドポイントを実装する。',
      },
    ],
  },
  {
    title: '完了',
    cards: [
      { title: '固定データでボードを表示する' },
      { title: 'useReducer で追加・編集・削除' },
      { title: 'ドラッグ&ドロップで並び替え' },
    ],
  },
]

export function createSampleDb(): DemoDb {
  const now = new Date().toISOString()
  const board: Board = {
    id: crypto.randomUUID(),
    title: 'マイボード',
    createdAt: now,
    updatedAt: now,
  }
  const db: DemoDb = { boards: [board], columns: [], cards: [] }

  sample.forEach((column, i) => {
    const columnId = crypto.randomUUID()
    db.columns.push({
      id: columnId,
      boardId: board.id,
      title: column.title,
      position: (i + 1) * POSITION_GAP,
      createdAt: now,
      updatedAt: now,
    })
    column.cards.forEach((card, j) => {
      db.cards.push({
        id: crypto.randomUUID(),
        columnId,
        title: card.title,
        description: card.description ?? '',
        position: (j + 1) * POSITION_GAP,
        createdAt: now,
        updatedAt: now,
      })
    })
  })
  return db
}
