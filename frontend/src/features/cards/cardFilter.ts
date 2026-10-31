import type { Card } from '@kanban/shared'

// カードの絞り込みの条件（docs/01-requirements.md の「カードの検索・絞り込み」）
export type CardFilter = {
  // 入力欄の文字。タイトルと説明から探す
  text: string
  // 選んだラベルの ID。どれか1つが付いているカードを残す
  labelIds: string[]
}

export const emptyCardFilter: CardFilter = { text: '', labelIds: [] }

// 比べる前に文字の形を揃える。
// NFKC で全角の英数字を半角に（「ＲＥＡＣＴ」→「REACT」）、toLowerCase で大文字を小文字にする
function normalize(text: string) {
  return text.normalize('NFKC').toLowerCase()
}

// 入力欄の文字を、空白（全角の空白も含む）で区切った語の配列にする
function searchWords(text: string) {
  return normalize(text)
    .split(/\s+/)
    .filter((word) => word !== '')
}

// 何か条件が指定されているか。指定がなければ、すべてのカードを表示する
export function isFiltering(filter: CardFilter) {
  return searchWords(filter.text).length > 0 || filter.labelIds.length > 0
}

// カードが条件に合うか。文字とラベルの両方を指定したときは、両方に合うものだけ
export function matchesCardFilter(card: Card, filter: CardFilter) {
  const target = normalize(`${card.title}\n${card.description}`)
  const matchesText = searchWords(filter.text).every((word) => target.includes(word))
  const matchesLabel =
    filter.labelIds.length === 0 || filter.labelIds.some((id) => card.labelIds.includes(id))
  return matchesText && matchesLabel
}
