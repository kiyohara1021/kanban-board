import type { Card, Label, LabelColor } from '@kanban/shared'

// DB に保存する色の名前と、画面での見た目の対応。
// Tailwind CSS はソースコードに書かれたクラス名を探して CSS を作るので、
// `bg-${color}-100` のように組み立てると CSS が作られない。クラス名は省略せずにそのまま書く
export const labelColorStyles: Record<LabelColor, { name: string; chip: string; swatch: string }> =
  {
    green: { name: '緑', chip: 'bg-green-100 text-green-800', swatch: 'bg-green-500' },
    yellow: { name: '黄', chip: 'bg-yellow-100 text-yellow-800', swatch: 'bg-yellow-400' },
    orange: { name: 'オレンジ', chip: 'bg-orange-100 text-orange-800', swatch: 'bg-orange-500' },
    red: { name: '赤', chip: 'bg-red-100 text-red-800', swatch: 'bg-red-500' },
    purple: { name: '紫', chip: 'bg-purple-100 text-purple-800', swatch: 'bg-purple-500' },
    blue: { name: '青', chip: 'bg-blue-100 text-blue-800', swatch: 'bg-blue-500' },
  }

// カードに付いているラベルを、ボードのラベル一覧の順（作った順）で返す。
// カードが持つのは ID だけなので、名前や色はボードのラベル一覧から引く（docs/03-api.md）
export function labelsOfCard(labels: Label[], card: Card): Label[] {
  return labels.filter((label) => card.labelIds.includes(label.id))
}
