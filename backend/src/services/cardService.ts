import {
  positionForInsert,
  type CreateCardInput,
  type MoveCardInput,
  type UpdateCardInput,
} from '@kanban/shared'
import type { Prisma } from '../../prisma/generated/client'
import { NotFoundError, ValidationError } from '../errors'
import { prisma } from '../lib/prisma'

// カードを読むときに、中間テーブルからラベルの ID も一緒に読む
export const cardInclude = {
  labels: { select: { labelId: true } },
} satisfies Prisma.CardInclude

// DB の形（labels: [{ labelId }]）を、API の形（labelIds: string[]）に変える（docs/03-api.md）
export function toCard<T extends { labels: { labelId: string }[] }>({ labels, ...card }: T) {
  return { ...card, labelIds: labels.map((label) => label.labelId) }
}

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
    const card = await tx.card.create({
      data: {
        title: input.title,
        description: input.description,
        position,
        column: { connect: { id: columnId } },
      },
      include: cardInclude,
    })
    return toCard(card)
  })
}

export async function getCard(cardId: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId }, include: cardInclude })
  if (!card) throw new NotFoundError('カード')
  return toCard(card)
}

export async function updateCard(cardId: string, input: UpdateCardInput) {
  const { labelIds, ...fields } = input
  // ラベルを変えないときは、カードの行を更新するだけ。対象がなければ P2025 で 404 になる
  if (labelIds === undefined) {
    return toCard(
      await prisma.card.update({ where: { id: cardId }, data: fields, include: cardInclude }),
    )
  }

  // ラベルを確かめてから付け替えるまでの間に、ラベルが消されないようトランザクションにする
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({
      where: { id: cardId },
      include: { column: { select: { boardId: true } } },
    })
    if (!card) throw new NotFoundError('カード')

    // 同じ ID が重なっていたら1つにまとめる（中間テーブルの主キーが重なるとエラーになる）
    const uniqueIds = [...new Set(labelIds)]
    // カードと同じボードのラベルだけを数える。数が合わなければ、ほかのボードのラベルか存在しない ID がある
    const count = await tx.label.count({
      where: { id: { in: uniqueIds }, boardId: card.column.boardId },
    })
    if (count !== uniqueIds.length) {
      throw new ValidationError([
        { path: 'labelIds', message: '同じボードのラベルを指定してください' },
      ])
    }

    // 中間テーブルの行をいったんすべて消し、送られた組で作り直す
    const updated = await tx.card.update({
      where: { id: cardId },
      data: {
        ...fields,
        labels: { deleteMany: {}, create: uniqueIds.map((labelId) => ({ labelId })) },
      },
      include: cardInclude,
    })
    return toCard(updated)
  })
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
    const moved = await tx.card.update({
      where: { id: cardId },
      data: { columnId: toColumn.id, position },
      include: cardInclude,
    })
    return toCard(moved)
  })
}

export async function deleteCard(cardId: string) {
  await prisma.card.delete({ where: { id: cardId } })
}
