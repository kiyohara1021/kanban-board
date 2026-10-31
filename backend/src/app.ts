import express from 'express'
import { prisma } from './lib/prisma'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'
import { boardsRouter } from './routes/boards'
import { cardsRouter } from './routes/cards'
import { columnsRouter } from './routes/columns'
import { labelsRouter } from './routes/labels'

// サーバーの起動（index.ts）と分けておくと、テストでは app をそのまま Supertest に渡せる
export const app = express()

app.use(express.json())

// 動作確認用。DB につながっていればボードの件数を返す
app.get('/api/health', async (_req, res) => {
  const boards = await prisma.board.count()
  res.json({ status: 'ok', boards })
})

// docs/03-api.md のエンドポイント
app.use('/api/boards', boardsRouter)
app.use('/api/columns', columnsRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/labels', labelsRouter)

// ルートの後ろに置く。どれにも当てはまらなかったリクエストと、途中で throw されたエラーがここに来る
app.use(notFoundHandler)
app.use(errorHandler)
