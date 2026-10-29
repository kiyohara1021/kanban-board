import {
  positionForInsert,
  type CreateCardInput,
  type MoveCardInput,
  type UpdateCardInput,
} from '@kanban/shared'
import { NotFoundError, ValidationError } from '../errors'
import { prisma } from '../lib/prisma'

// カラムの末尾に追加する
export function createCard(columnId: string, input: CreateCardInput) {
  return prisma.$transaction(async (tx) => {
    const siblings = await tx.card.findMany({
      where: { columnId },
      orderBy: { position: 'asc' },
      select: { position: true },
    })
    const { position } = positionForInsert(siblings, siblings.length)
    // カラムがなければ connect が P2025 のエラーになり、404 が返る
    return tx.card.create({
      data: {
        title: input.title,
        description: input.description,
        position,
        column: { connect: { id: columnId } },
      },
    })
  })
}

export async function getCard(cardId: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId } })
  if (!card) throw new NotFoundError('カード')
  return card
}

export function updateCard(cardId: string, input: UpdateCardInput) {
  return prisma.card.update({ where: { id: cardId }, data: input })
}

// 同じカラムの中の並び替えと、別のカラムへの移動の両方に使う。
// index は移動先での位置（0始まり）。移動するカード自身を除いた並びで数える
export function moveCard(cardId: string, input: MoveCardInput) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({
      where: { id: cardId },
      include: { column: { select: { boardId: true } } },
    })
    if (!card) throw new NotFoundError('カード')

    // 移動先は、同じボードのカラムに限る
    const toColumn = await tx.column.findUnique({ where: { id: input.columnId } })
    if (!toColumn || toColumn.boardId !== card.column.boardId) {
      throw new ValidationError([
        { path: 'columnId', message: '同じボードのカラムを指定してください' },
      ])
    }

    const siblings = await tx.card.findMany({
      where: { columnId: toColumn.id, NOT: { id: cardId } },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    })
    const { items, position } = positionForInsert(siblings, input.index)

    if (items !== siblings) {
      for (const item of items) {
        await tx.card.update({ where: { id: item.id }, data: { position: item.position } })
      }
    }
    return tx.card.update({
      where: { id: cardId },
      data: { columnId: toColumn.id, position },
    })
  })
}

export async function deleteCard(cardId: string) {
  await prisma.card.delete({ where: { id: cardId } })
}
