import {
  POSITION_GAP,
  toDateString,
  type Board,
  type Card,
  type Column,
  type Label,
  type LabelColor,
} from '@kanban/shared'

// DB に保存するカードの行。API で返す labelIds は持たず、中間テーブル（cardLabels）から作る
export type CardRow = Omit<Card, 'labelIds'>
// カードとラベルの中間テーブル（backend の CardLabel）の行
export type CardLabelRow = { cardId: string; labelId: string }

// デモ版（GitHub Pages）の「DB」。バックエンドのテーブルと同じ形で、ブラウザの localStorage に保存する。
// 訪れた人ごとにブラウザの中にデータがあるので、ほかの人のデータを壊すことはない
export type DemoDb = {
  boards: Board[]
  columns: Column[]
  cards: CardRow[]
  labels: Label[]
  cardLabels: CardLabelRow[]
}

export function emptyDb(): DemoDb {
  return { boards: [], columns: [], cards: [], labels: [], cardLabels: [] }
}

const STORAGE_KEY = 'kanban-board-demo:v1'

export function loadDb(): DemoDb {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      // ラベルを足す前に保存されたデータには labels と cardLabels がないので、空の配列で補う
      const db = { ...emptyDb(), ...(JSON.parse(saved) as Partial<DemoDb>) }
      // 期限日を足す前に保存されたカードには dueDate がないので、null（未設定）で補う
      return { ...db, cards: db.cards.map((card) => ({ ...card, dueDate: card.dueDate ?? null })) }
    }
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
const sampleLabels: { name: string; color: LabelColor }[] = [
  { name: 'フロントエンド', color: 'blue' },
  { name: 'バックエンド', color: 'green' },
  { name: '設計', color: 'purple' },
]

// 今日から days 日後（負の数なら前）の日付。期限日を固定の日付にすると、いつかすべて期限切れになるので、
// サンプルを作った日を基準にして「期限切れ」と「まだ先」のカードが必ずできるようにする
function daysFromToday(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toDateString(date)
}

// カードの labels には、上のラベルの名前を書く
const sample: {
  title: string
  cards: { title: string; description?: string; labels?: string[]; dueDate?: string }[]
}[] = [
  {
    title: 'ToDo',
    cards: [
      {
        title: 'TanStack Query で API とつなぐ',
        description: 'Step 5。useQuery でボードを取得する。',
        labels: ['フロントエンド'],
        dueDate: daysFromToday(3),
      },
      {
        title: 'カード詳細を URL で開けるようにする',
        description: 'Step 6。React Router を使う。',
        labels: ['フロントエンド', '設計'],
        dueDate: daysFromToday(10),
      },
    ],
  },
  {
    title: '進行中',
    cards: [
      {
        title: 'バックエンド API を作る',
        description: 'Step 4。docs/03-api.md のエンドポイントを実装する。',
        labels: ['バックエンド'],
        dueDate: daysFromToday(-2),
      },
    ],
  },
  {
    title: '完了',
    cards: [
      { title: '固定データでボードを表示する', labels: ['フロントエンド'] },
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
  const db: DemoDb = { ...emptyDb(), boards: [board] }
  sampleLabels.forEach((label) => {
    db.labels.push({
      id: crypto.randomUUID(),
      boardId: board.id,
      ...label,
      createdAt: now,
      updatedAt: now,
    })
  })
  const labelIdOf = (name: string) => {
    const label = db.labels.find((label) => label.name === name)
    if (!label) throw new Error(`ラベル「${name}」が sampleLabels にありません`)
    return label.id
  }

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
      const cardId = crypto.randomUUID()
      for (const name of card.labels ?? []) db.cardLabels.push({ cardId, labelId: labelIdOf(name) })
      db.cards.push({
        id: cardId,
        columnId,
        title: card.title,
        description: card.description ?? '',
        position: (j + 1) * POSITION_GAP,
        dueDate: card.dueDate ?? null,
        createdAt: now,
        updatedAt: now,
      })
    })
  })
  return db
}
