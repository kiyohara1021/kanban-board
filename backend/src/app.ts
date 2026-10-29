import express from 'express'
import { prisma } from './lib/prisma'

// サーバーの起動（index.ts）と分けておくと、テストでは app をそのまま Supertest に渡せる
export const app = express()

app.use(express.json())

// 動作確認用。DB につながっていればボードの件数を返す。
// Step 4 で docs/03-api.md のエンドポイントを routes/ に追加する
app.get('/api/health', async (_req, res) => {
  const boards = await prisma.board.count()
  res.json({ status: 'ok', boards })
})
