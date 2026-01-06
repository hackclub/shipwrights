import { PrismaClient } from '@prisma/client'

const g = globalThis as unknown as { db: PrismaClient | undefined }

export const prisma = g.db ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') g.db = prisma
