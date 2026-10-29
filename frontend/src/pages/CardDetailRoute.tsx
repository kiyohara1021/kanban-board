import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router'
import { now } from '@/features/boards/actionValues'
import { findCard } from '@/features/boards/boardReducer'
import { CardDetailModal } from '@/features/cards/components/CardDetailModal'
import type { BoardOutletContext } from './BoardPage'

// /boards/:boardId/cards/:cardId（ボードの上に重ねるカード詳細）
export function CardDetailRoute() {
  const { cardId = '' } = useParams()
  // 親ルート（BoardPage）が取得したボードを受け取る。カードの情報はボードの詳細に含まれている
  const { board, run } = useOutletContext<BoardOutletContext>()
  const navigate = useNavigate()
  const card = findCard(board, cardId)
  const boardPath = `/boards/${board.id}`

  // 削除されたカードや、間違った URL のときはボードに戻す。
  // replace にすると、戻るボタンでこの URL に戻ってこない
  if (!card) return <Navigate to={boardPath} replace />

  return (
    // key に card.id を渡すと、別のカードを開いたときにフォームの state が作り直される
    <CardDetailModal
      key={card.id}
      card={card}
      onSave={(changes) => run({ type: 'updateCard', cardId: card.id, ...changes, now: now() })}
      onDelete={() => run({ type: 'deleteCard', cardId: card.id })}
      onClose={() => navigate(boardPath)}
    />
  )
}
