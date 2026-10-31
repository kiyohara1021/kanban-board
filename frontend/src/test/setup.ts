// expect(...).toBeInTheDocument() など、DOM 用の判定を使えるようにする
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'sonner'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { emptyDb, saveDb } from '@/demo/db'
import { server } from './server'

// テストの間だけ、/api へのリクエストを MSW が受け取る。
// ハンドラーのない URL に送ったらテストを失敗させ、URL の書き間違いにすぐ気付けるようにする
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

// テストごとに DB を空にする。何も保存していないとサンプルが作られるので、空の DB を保存しておく
beforeEach(() => {
  saveDb(emptyDb())
})

// テストごとに、描画した画面を片付ける（Vitest の globals を使っていないので、自分で登録する）。
// server.use で足したハンドラーも外し、ほかのテストに影響しないようにする。
// 通知（sonner）は画面とは別に表示中の一覧を持ち、次に描画した Toaster がそれを引き継ぐので、
// 前のテストのエラー通知が残らないように消しておく
afterEach(() => {
  cleanup()
  server.resetHandlers()
  toast.dismiss()
})

afterAll(() => {
  server.close()
})
