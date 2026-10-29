import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { DATABASE_URL } from './src/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // npm run db:seed（prisma db seed）で実行する
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: DATABASE_URL,
  },
})
