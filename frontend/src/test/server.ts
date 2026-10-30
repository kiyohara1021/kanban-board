import { setupServer } from 'msw/node'
import { handlers } from '@/demo/handlers'

// 画面のテストで使う MSW のサーバー。デモ版と同じハンドラーで /api を受け、
// jsdom の localStorage を DB として API を再現する。
// fetch そのものを偽物にするのではなく「ネットワークの手前」で受けるので、
// apiClient.ts のエラー変換なども本物と同じように動く
export const server = setupServer(...handlers)
