import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../../prisma/generated/client'
import { DATABASE_URL } from '../config'

// Prisma 7 は DB ごとのアダプター経由で接続する。SQLite には libsql のアダプターを使う
const adapter = new PrismaLibSql({ url: DATABASE_URL })

export const prisma = new PrismaClient({ adapter })
