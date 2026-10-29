// expect(...).toBeInTheDocument() など、DOM 用の判定を使えるようにする
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// テストごとに、描画した画面を片付ける（Vitest の globals を使っていないので、自分で登録する）
afterEach(() => {
  cleanup()
})
