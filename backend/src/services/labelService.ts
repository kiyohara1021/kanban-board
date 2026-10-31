import type { CreateLabelInput } from '@kanban/shared'
import { prisma } from '../lib/prisma'

// ボードがなければ connect が P2025 のエラーになり、404 が返る
export function createLabel(boardId: string, input: CreateLabelInput) {
  return prisma.label.create({
    data: { name: input.name, color: input.color, board: { connect: { id: boardId } } },
  })
}

// 付けていたカードとのつながり（CardLabel の行）は、DB のカスケード削除で一緒に消える
export async function deleteLabel(labelId: string) {
  await prisma.label.delete({ where: { id: labelId } })
}
