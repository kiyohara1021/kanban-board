import {
  positionForInsert,
  type CreateColumnInput,
  type MoveColumnInput,
  type UpdateColumnInput,
} from '@kanban/shared'
import { NotFoundError } from '../errors'
import { prisma } from '../lib/prisma'

// 末尾に追加する。最後のカラムを読んでから作るまでの間に別の追加が入らないよう、トランザクションにする
export function createColumn(boardId: string, input: CreateColumnInput) {
  return prisma.$transaction(async (tx) => {
    const siblings = await tx.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      select: { position: true },
    })
    const { position } = positionForInsert(siblings, siblings.length)
    // ボードがなければ connect が P2025 のエラーになり、404 が返る
    return tx.column.create({
      data: { title: input.title, position, board: { connect: { id: boardId } } },
    })
  })
}

export function updateColumn(columnId: string, input: UpdateColumnInput) {
  return prisma.column.update({ where: { id: columnId }, data: input })
}

// index は移動後の位置（0始まり）。移動するカラム自身を除いた並びで数える
export function moveColumn(columnId: string, input: MoveColumnInput) {
  return prisma.$transaction(async (tx) => {
    const column = await tx.column.findUnique({ where: { id: columnId } })
    if (!column) throw new NotFoundError('カラム')

    const siblings = await tx.column.findMany({
      where: { boardId: column.boardId, NOT: { id: columnId } },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    })
    const { items, position } = positionForInsert(siblings, input.index)

    // 隙間が狭くなって振り直したときは、ほかのカラムの position も保存する
    if (items !== siblings) {
      for (const item of items) {
        await tx.column.update({ where: { id: item.id }, data: { position: item.position } })
      }
    }
    return tx.column.update({ where: { id: columnId }, data: { position } })
  })
}

export async function deleteColumn(columnId: string) {
  await prisma.column.delete({ where: { id: columnId } })
}
