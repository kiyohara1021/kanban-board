import { POSITION_GAP, type CreateBoardInput, type UpdateBoardInput } from '@kanban/shared'
import { NotFoundError } from '../errors'
import { prisma } from '../lib/prisma'
import { cardInclude, toCard } from './cardService'

// 新しいボードに最初から用意するカラム
const DEFAULT_COLUMNS = ['ToDo', '進行中', '完了']

export function listBoards() {
  return prisma.board.findMany({ orderBy: { createdAt: 'desc' } })
}

export function createBoard(input: CreateBoardInput) {
  return prisma.board.create({
    data: {
      title: input.title,
      columns: {
        create: DEFAULT_COLUMNS.map((title, i) => ({ title, position: (i + 1) * POSITION_GAP })),
      },
    },
  })
}

// ボード画面を1回で描画できるよう、カラムとカードを並び順どおりに、ラベルを作った順に含めて返す
export async function getBoardDetail(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: { cards: { orderBy: { position: 'asc' }, include: cardInclude } },
      },
      labels: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!board) throw new NotFoundError('ボード')
  return {
    ...board,
    columns: board.columns.map((column) => ({ ...column, cards: column.cards.map(toCard) })),
  }
}

// 対象がないときは Prisma が P2025 のエラーを投げ、errorHandler が 404 にする
export function updateBoard(boardId: string, input: UpdateBoardInput) {
  return prisma.board.update({ where: { id: boardId }, data: input })
}

export async function deleteBoard(boardId: string) {
  await prisma.board.delete({ where: { id: boardId } })
}
