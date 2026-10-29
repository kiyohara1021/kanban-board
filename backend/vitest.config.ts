import { defineConfig } from 'vitest/config'
import { TEST_DATABASE_URL } from './test/globalSetup.ts'

export default defineConfig({
  test: {
    env: { DATABASE_URL: TEST_DATABASE_URL },
    globalSetup: './test/globalSetup.ts',
    // テストファイルどうしが同じ DB ファイルを使うので、並列に実行しない
    fileParallelism: false,
  },
})
