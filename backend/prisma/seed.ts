// 動作確認用のサンプルデータ。何度実行しても同じ状態になるよう、既存のデータを消してから作る
import 'dotenv/config'
import { POSITION_GAP } from '@kanban/shared'
import { prisma } from '../src/lib/prisma'

const columns: { title: string; cards: { title: string; description?: string }[] }[] = [
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

async function main() {
  await prisma.board.deleteMany()

  const board = await prisma.board.create({
    data: {
      title: 'マイボード',
      columns: {
        create: columns.map((column, i) => ({
          title: column.title,
          position: (i + 1) * POSITION_GAP,
          cards: {
            create: column.cards.map((card, j) => ({
              title: card.title,
              description: card.description ?? '',
              position: (j + 1) * POSITION_GAP,
            })),
          },
        })),
      },
    },
  })
  console.log(`サンプルのボードを作りました: ${board.title}（${board.id}）`)
}

await main()
