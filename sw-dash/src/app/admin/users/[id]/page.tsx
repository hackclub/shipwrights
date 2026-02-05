import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { UserProfile } from './user-profile'

interface Params {
  params: Promise<{ id: string }>
}

export default async function Profile({ params }: Params) {
  const { id } = await params
  const currentUser = await getUser()
  if (!currentUser) redirect('/')
  if (!can(currentUser.role, PERMS.users_view)) redirect('/admin')

  const userId = parseInt(id, 10)
  if (isNaN(userId)) notFound()

  const [user, keys, logs, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        slackId: true,
        isActive: true,
        role: true,
        createdAt: true,
        avatar: true,
        staffNotes: true,
        skills: true,
        ftuid: true,
      },
    }),
    prisma.yubikey.findMany({
      where: { userId },
      select: { id: true, credentialId: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { admin: { select: { username: true } } },
    }),
    (async () => {
      const total = await prisma.shipCert.count({ where: { reviewerId: userId } })
      if (!total) return null
      const [approved, rejected] = await Promise.all([
        prisma.shipCert.count({ where: { reviewerId: userId, status: 'approved' } }),
        prisma.shipCert.count({ where: { reviewerId: userId, status: 'rejected' } }),
      ])
      return { total, approved, rejected }
    })(),
  ])

  if (!user) notFound()

  const userData = {
    id: user.id,
    username: user.username,
    slackId: user.slackId,
    isActive: user.isActive,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    avatar: user.avatar,
    staffNotes: user.staffNotes,
    skills: (user.skills as string[] | null) || [],
    ftuid: user.ftuid,
  }

  const keysData = keys.map((k) => ({
    id: k.id,
    credentialId: k.credentialId,
    createdAt: k.createdAt.toISOString(),
  }))
  const logsData = logs.map((l) => ({
    id: l.id,
    action: l.action,
    details: l.details,
    admin: l.admin,
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full px-2 md:px-4">
        <Link
          href="/admin/users"
          className="text-amber-300/70 hover:text-amber-200 font-mono text-sm transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back to users
        </Link>
        <UserProfile
          user={userData}
          keys={keysData}
          logs={logsData}
          stats={stats}
          currentUser={{
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
          }}
        />
      </div>
    </main>
  )
}
