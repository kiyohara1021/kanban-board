import type { Label } from '@kanban/shared'
import { useSearchParams } from 'react-router'
import type { CardFilter } from './cardFilter'

// 絞り込みの条件を、URL のクエリ（?q=react&label=<ID>&label=<ID>）から読み書きする。
// 開いているカードと同じく URL に持つと、再読み込みしても条件が残り、URL を共有できる
export function useCardFilter(labels: Label[]) {
  const [searchParams, setSearchParams] = useSearchParams()

  const filter: CardFilter = {
    text: searchParams.get('q') ?? '',
    // 削除されたラベルの ID が URL に残っていても無視する。
    // 残したままだと、どのカードにも付いていないラベルで絞り込むことになり、1枚も表示されなくなる
    labelIds: searchParams.getAll('label').filter((id) => labels.some((label) => label.id === id)),
  }

  function setFilter(next: CardFilter) {
    const params = new URLSearchParams()
    if (next.text !== '') params.set('q', next.text)
    for (const labelId of next.labelIds) params.append('label', labelId)
    // replace：履歴に積まずに URL を置き換える。積むと、戻るボタンで1文字ずつ戻ることになる
    setSearchParams(params, { replace: true })
  }

  return { filter, setFilter }
}
