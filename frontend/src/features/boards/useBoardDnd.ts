import {
  closestCenter,
  closestCorners,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react'
import { boardReducer, findCard, findColumnOfCard, type BoardAction } from './boardReducer'
import type { BoardDetail, Card } from '@kanban/shared'

// useSortable の data に入れる値。ドラッグしているのがカードかカラムかを見分けるのに使う
export type DragData = { type: 'card' } | { type: 'column' }

const now = () => new Date().toISOString()

// どの要素の上にいるかの判定方法。dnd-kit 公式の「複数のリスト」のサンプルを参考にしている
const detectCollision: CollisionDetection = (args) => {
  // カラムを動かしているときは、カラム同士だけで一番近いものを選ぶ
  if (args.active.data.current?.type === 'column') {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) => container.data.current?.type === 'column',
      ),
    })
  }

  // キーボード操作のときはポインターの位置がないので、角の近さで選ぶ。
  // 重なりの大きさで選ぶと、高さの違うカードを飛び越えてしまうことがある。
  // カードの入ったカラム全体は大きくて選ばれやすいので、対象はカードと空のカラムだけにする
  if (!args.pointerCoordinates) {
    const hasCards = (columnId: UniqueIdentifier) =>
      args.droppableContainers.some(
        (container) => container.data.current?.sortable?.containerId === columnId,
      )
    return closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) => container.data.current?.type === 'card' || !hasCards(container.id),
      ),
    })
  }

  // カードのときは、まずポインターの真下にあるもの、なければ重なっているものを探す
  const pointerCollisions = pointerWithin(args)
  const collisions = pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args)
  const overId = getFirstCollision(collisions, 'id')
  if (overId == null) return []

  const overContainer = args.droppableContainers.find((container) => container.id === overId)
  if (overContainer?.data.current?.type !== 'column') return [{ id: overId }]

  // カラムの上にいるなら、そのカラムのカードの中で一番近いものを選ぶ。カードがなければカラムそのもの
  const cardsInColumn = args.droppableContainers.filter(
    (container) => container.data.current?.sortable?.containerId === overId,
  )
  if (cardsInColumn.length === 0) return [{ id: overId }]
  return closestCenter({ ...args, droppableContainers: cardsInColumn })
}

// キーボード操作で、カードを ← → キーで隣のカラムへ動かすときの移動先。
// 標準の sortableKeyboardCoordinates は1つのリストの中の移動を前提にしているため、
// 隣のカラムの先頭のカード（カラムが空ならカラムそのもの）の位置を返すようにする
const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  const { active, collisionRect, droppableRects, droppableContainers } = args.context
  const isHorizontal = event.code === 'ArrowLeft' || event.code === 'ArrowRight'
  if (!isHorizontal || active?.data.current?.type !== 'card' || !collisionRect) {
    return sortableKeyboardCoordinates(event, args)
  }
  event.preventDefault()

  const containers = droppableContainers.getEnabled()
  const columns = containers
    .filter((container) => container.data.current?.type === 'column')
    .flatMap((container) => {
      const rect = droppableRects.get(container.id)
      return rect ? [{ id: container.id, rect }] : []
    })
    .sort((a, b) => a.rect.left - b.rect.left)

  const center = collisionRect.left + collisionRect.width / 2
  const current = columns.findIndex(({ rect }) => rect.left <= center && center < rect.right)
  const target = columns[current + (event.code === 'ArrowRight' ? 1 : -1)]
  if (!target) return undefined

  const firstCardRect = containers
    .filter(
      (container) =>
        container.data.current?.sortable?.containerId === target.id && container.id !== active.id,
    )
    .flatMap((container) => droppableRects.get(container.id) ?? [])
    .sort((a, b) => a.top - b.top)[0]
  const rect = firstCardRect ?? target.rect
  return { x: rect.left, y: rect.top }
}

// スクリーンリーダー向けの説明と読み上げ（初期値は英語なので日本語にする）
const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'Space キーで持ち上げ、矢印キーで動かし、もう一度 Space キーで置きます。Esc キーで取り消します。',
}
const announcements: Announcements = {
  onDragStart: () => '持ち上げました。',
  onDragOver: ({ over }) => (over ? '移動しています。' : '置ける場所の外にいます。'),
  onDragEnd: ({ over }) => (over ? '置きました。' : '元の場所に戻しました。'),
  onDragCancel: () => '移動を取り消しました。',
}

/**
 * カードを落としたときの、moveCard の index（カラムの中で何番目に入れるか）を返す。
 * cards は、ドラッグ中のカードと、絞り込みで隠れているカードも含めたカラムのすべてのカード。
 *
 * 重ねたカード（over）が今いる番号に入れる。moveCard はカードを抜いてから入れるので、
 * 下へ動かしたときは重ねたカードの直後、上へ動かしたときは直前に入る（dnd-kit の見た目と同じ）。
 * 画面に表示しているカードだけの並びで数えると、隠れているカードの分だけ保存する位置がずれる
 */
export function cardDropIndex(cards: Card[], activeId: string, overId: string): number {
  const overIndex = cards.findIndex((card) => card.id === overId)
  // カードのない場所（カラムそのもの）に落としたときは、今の位置のまま
  if (overIndex === -1) return cards.findIndex((card) => card.id === activeId)
  return overIndex
}

// board には、絞り込む前のボードを渡す。並び順の計算に、隠れているカードも含めた並びが要るため。
// 絞り込みは、返した shownBoard を表示するときに行う
export function useBoardDnd(board: BoardDetail, dispatch: Dispatch<BoardAction>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  // カードをドラッグしている間だけ使う仮のボード。カラムをまたいだ移動を、ドロップ前から画面に映すために使う。
  // 本物の board はドロップしたときに1回だけ dispatch で更新する（Step 5 では、ここが API 呼び出し1回になる）
  const [dragBoard, setDragBoard] = useState<BoardDetail | null>(null)

  // カードが別のカラムに移った直後かどうか。移った直後は各要素の位置の測り直しが間に合っておらず、
  // 古い位置で判定すると元のカラムに戻され、行ったり来たりを繰り返してしまう（無限ループになる）。
  // 画面の表示には使わない値なので、state ではなく ref に持つ
  const movedToNewColumnRef = useRef(false)
  useEffect(() => {
    // 画面が描き直された次のフレームで、判定を再開する
    const frame = requestAnimationFrame(() => {
      movedToNewColumnRef.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [dragBoard])

  const collisionDetection: CollisionDetection = useCallback((args) => {
    // 移った直後は、ドラッグ中のカード自身の上にいることにして、判定を止める
    if (movedToNewColumnRef.current && args.active.data.current?.type === 'card') {
      return [{ id: args.active.id }]
    }
    return detectCollision(args)
  }, [])

  const sensors = useSensors(
    // マウス：5px 以上動かしたらドラッグ開始。それより小さければクリック（カードを開く）
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // タッチ：250ms 長押しでドラッグ開始。すぐ指を動かしたときは横スクロールになる
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    // キーボード：Space で持ち上げて矢印キーで動かす。Enter はカードを開くのに使う
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  const shownBoard = dragBoard ?? board
  const activeCard = activeId === null ? undefined : findCard(shownBoard, activeId)
  const activeColumn =
    activeId === null ? undefined : shownBoard.columns.find((column) => column.id === activeId)

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
    if (active.data.current?.type === 'card') setDragBoard(board)
  }

  // カードが別のカラムの上に来たら、仮のボードの中でそのカラムへ移す。
  // 同じカラムの中の並び替えは、dnd-kit が見た目だけずらしてくれるので、ここでは何もしない
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || !dragBoard || active.data.current?.type !== 'card') return
    const cardId = String(active.id)
    const overId = String(over.id)

    const fromColumn = findColumnOfCard(dragBoard, cardId)
    const toColumn =
      over.data.current?.type === 'column'
        ? dragBoard.columns.find((column) => column.id === overId)
        : findColumnOfCard(dragBoard, overId)
    if (!fromColumn || !toColumn || fromColumn === toColumn) return

    // カードの上ならその位置に、カラムの上（カードがない場所）なら末尾に入れる
    const overIndex = toColumn.cards.findIndex((card) => card.id === overId)
    const index = overIndex === -1 ? toColumn.cards.length : overIndex
    movedToNewColumnRef.current = true
    setDragBoard(
      boardReducer(dragBoard, {
        type: 'moveCard',
        cardId,
        toColumnId: toColumn.id,
        index,
        now: now(),
      }),
    )
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const preview = dragBoard
    setActiveId(null)
    setDragBoard(null)
    if (!over) return

    const activeKey = String(active.id)
    const overKey = String(over.id)

    if (active.data.current?.type === 'column') {
      const index = board.columns.findIndex((column) => column.id === overKey)
      if (index !== -1) dispatch({ type: 'moveColumn', columnId: activeKey, index, now: now() })
      return
    }

    // 仮のボードでは、カードはすでに移動先のカラムに入っている。あとはカラムの中での位置を決める
    if (!preview) return
    const column = findColumnOfCard(preview, activeKey)
    if (!column) return
    const index = cardDropIndex(column.cards, activeKey, overKey)
    dispatch({ type: 'moveCard', cardId: activeKey, toColumnId: column.id, index, now: now() })
  }

  function handleDragCancel() {
    setActiveId(null)
    setDragBoard(null)
  }

  return {
    shownBoard,
    activeCard,
    activeColumn,
    // <DndContext {...contextProps}> のように、そのまま渡せる形にしておく
    contextProps: {
      sensors,
      collisionDetection,
      accessibility: { screenReaderInstructions, announcements },
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragEnd: handleDragEnd,
      onDragCancel: handleDragCancel,
    },
  }
}
