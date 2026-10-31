import { toDateString } from '@kanban/shared'
import { useSyncExternalStore } from 'react'

// 今日の日付（"2026-11-05"）を返すフック。
// 描画の中で new Date() を呼ぶと、同じ props でも呼んだときによって結果が変わる（純粋でなくなる）。
// 「今の日付」は React の外にある値なので、useSyncExternalStore で外の値として読む。
// 1分ごとに確かめ、日付が変わったときだけ描画し直す（返す文字列が前と同じなら React は何もしない）
export function useToday() {
  return useSyncExternalStore(subscribe, getToday)
}

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 60_000)
  return () => clearInterval(timer)
}

function getToday() {
  return toDateString(new Date())
}
