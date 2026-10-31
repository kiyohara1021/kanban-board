// 動作確認用のサンプルデータ。何度実行しても同じ状態になるよう、既存のデータを消してから作る
import 'dotenv/config'
import { POSITION_GAP, type LabelColor } from '@kanban/shared'
import { prisma } from '../src/lib/prisma'

const labels: { name: string; color: LabelColor }[] = [
  { name: 'フロントエンド', color: 'blue' },
  { name: 'バックエンド', color: 'green' },
  { name: '設計', color: 'purple' },
]

// カードの labels には、上のラベルの名前を書く
const columns: {
  title: string
  cards: { title: string; description?: string; labels?: string[] }[]
}[] = [
  {
    title: 'ToDo',
    cards: [
      {
        title: 'TanStack Query で API とつなぐ',
        description: 'Step 5。useQuery でボードを取得する。',
        labels: ['フロントエンド'],
      },
      {
        title: 'カード詳細を URL で開けるようにする',
        description: 'Step 6。React Router を使う。',
        labels: ['フロントエンド', '設計'],
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

async function main() {
  await prisma.board.deleteMany()

  // カードにラベルを付けるにはラベルの ID が要るので、先にボードとラベルを作る
  const board = await prisma.board.create({
    data: { title: 'マイボード', labels: { create: labels } },
    include: { labels: true },
  })
  const labelIds = new Map(board.labels.map((label) => [label.name, label.id]))
  const labelIdOf = (name: string) => {
    const id = labelIds.get(name)
    if (!id) throw new Error(`ラベル「${name}」が labels にありません`)
    return id
  }

  for (const [i, column] of columns.entries()) {
    await prisma.column.create({
      data: {
        boardId: board.id,
        title: column.title,
        position: (i + 1) * POSITION_GAP,
        cards: {
          create: column.cards.map((card, j) => ({
            title: card.title,
            description: card.description ?? '',
            position: (j + 1) * POSITION_GAP,
            // 中間テーブル（CardLabel）の行を、カードと一緒に作る
            labels: {
              create: (card.labels ?? []).map((name) => ({ labelId: labelIdOf(name) })),
            },
          })),
        },
      },
    })
  }
  console.log(`サンプルのボードを作りました: ${board.title}（${board.id}）`)
}

await main()
