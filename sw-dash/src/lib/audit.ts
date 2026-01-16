import { prisma } from './db'

export async function log(userId: number, adminId: number, action: string, details?: string) {
  await prisma.auditLog.create({
    data: {
      userId,
      adminId,
      action,
      details,
    },
  })
}
