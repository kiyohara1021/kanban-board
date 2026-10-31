import type { BoardDetail } from '@kanban/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createCard, deleteCard, moveCard, updateCard } from '@/features/cards/api'
import { createColumn, deleteColumn, moveColumn, updateColumn } from '@/features/columns/api'
import { deleteLabel } from '@/features/labels/api'
import { boardReducer, type BoardAction } from './boardReducer'
import { boardKeys } from './queries'

// アクションを、対応する API の呼び出しに変える。
// Step 2〜3 でアクションの形を API と揃えておいたので、ほぼそのまま渡せる
export function sendAction(boardId: string, action: BoardAction): Promise<unknown> {
  switch (action.type) {
    case 'addColumn':
      return createColumn(boardId, { title: action.title })
    case 'renameColumn':
      return updateColumn(action.columnId, { title: action.title })
    case 'deleteColumn':
      return deleteColumn(action.columnId)
    case 'moveColumn':
      return moveColumn(action.columnId, { index: action.index })
    case 'addCard':
      return createCard(action.columnId, { title: action.title, description: '' })
    case 'updateCard':
      return updateCard(action.cardId, {
        title: action.title,
        description: action.description,
        labelIds: action.labelIds,
        dueDate: action.dueDate,
      })
    case 'deleteCard':
      return deleteCard(action.cardId)
    case 'moveCard':
      return moveCard(action.cardId, { columnId: action.toColumnId, index: action.index })
    case 'deleteLabel':
      return deleteLabel(action.labelId)
  }
}

// ボードを変更するアクションを受け取り、画面（キャッシュ）を先に更新してから API を呼ぶ（楽観的更新）。
// 画面の書き換えには Step 2〜3 の boardReducer をそのまま使う
export function useBoardAction(boardId: string) {
  const queryClient = useQueryClient()
  const queryKey = boardKeys.detail(boardId)
  // 同じボードへの変更をまとめて数えるためのキー
  const mutationKey = ['boardAction', boardId]

  const mutation = useMutation({
    mutationKey,
    mutationFn: (action: BoardAction) => sendAction(boardId, action),

    // 1. API を呼ぶ前に、キャッシュを reducer で書き換えて画面にすぐ反映する
    onMutate: async (action) => {
      // 取得中のデータが後から届いて、書き換えを上書きしないように止める
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<BoardDetail>(queryKey)
      if (previous) queryClient.setQueryData(queryKey, boardReducer(previous, action))
      return { previous }
    },

    // 2. 失敗したら、書き換える前のデータに戻してエラーを知らせる
    onError: (error, _action, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      toast.error(error.message)
    },

    // 3. 成功・失敗どちらでも、サーバーの状態を取り直して合わせる。
    //    ただし、続けて操作して別の変更がまだ送信中なら、最後の1件が終わるまで待つ
    //    （途中で取り直すと、送信中の変更が一瞬元に戻って見えるため）
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) === 1) {
        return queryClient.invalidateQueries({ queryKey })
      }
    },
  })

  return mutation.mutate
}
