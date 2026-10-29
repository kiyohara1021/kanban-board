// 並び順（position）の計算。docs/02-data-model.md の「並び順の持ち方」を参照
// Step 4 でバックエンドからも使えるよう、React に依存しない関数だけを置く

export const POSITION_GAP = 1000
// 隣との差がこれより小さくなったら振り直す
export const MIN_POSITION_GAP = 0.001

type Positioned = { position: number }

/**
 * items（移動する要素を除いた並び）の index 番目に入れるときの position を返す。
 * 隙間が狭すぎるときは items を 1000, 2000, 3000… に振り直し、振り直した items も返す
 */
export function positionForInsert<T extends Positioned>(
  items: T[],
  index: number,
): { items: T[]; position: number } {
  const prev = items[index - 1]?.position
  const next = items[index]?.position

  let position: number
  if (prev === undefined && next === undefined) {
    position = POSITION_GAP
  } else if (prev === undefined) {
    position = next! / 2
  } else if (next === undefined) {
    position = prev + POSITION_GAP
  } else {
    position = (prev + next) / 2
  }

  const tooClose =
    (prev !== undefined && position - prev < MIN_POSITION_GAP) ||
    (next !== undefined && next - position < MIN_POSITION_GAP)
  if (!tooClose) return { items, position }

  // 挿入する場所を1つ空けて振り直す
  const renumbered = items.map((item, i) => ({
    ...item,
    position: (i < index ? i + 1 : i + 2) * POSITION_GAP,
  }))
  return { items: renumbered, position: (index + 1) * POSITION_GAP }
}
