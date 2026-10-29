import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'

// 開発用の DB（dev.db）を壊さないよう、テストでは専用の SQLite ファイルを使う
export const TEST_DATABASE_URL = 'file:./prisma/test.db'

// すべてのテストの前に1回だけ実行する。空のテスト用 DB を作り、マイグレーションを当てる
export default function setup() {
  rmSync('prisma/test.db', { force: true })
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  })
}
