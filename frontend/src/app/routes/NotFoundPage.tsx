import { Link } from 'react-router'
import { StatusMessage } from '@/components/StatusMessage'

// どのルートにも当てはまらない URL（path: '*'）
export function NotFoundPage() {
  return (
    <StatusMessage>
      <p>ページが見つかりません。</p>
      <Link to="/" className="text-sky-700 underline">
        ボード一覧に戻る
      </Link>
    </StatusMessage>
  )
}
