import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { UsersView } from './users-view'

export default async function Users() {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.users_view)) redirect('/admin')

  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      username: true,
      slackId: true,
      isActive: true,
      role: true,
      createdAt: true,
      avatar: true,
    },
  })

  const data = users.map((u) => ({
    id: u.id,
    username: u.username,
    slackId: u.slackId,
    isActive: u.isActive,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    avatar: u.avatar,
  }))

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full px-2 md:px-4">
        <Link
          href="/admin"
          className="text-amber-300/70 hover:text-amber-200 font-mono text-sm transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back to admin
        </Link>
        <UsersView
          users={data}
          canEdit={can(user.role, PERMS.users_edit)}
          canAdd={can(user.role, PERMS.users_add)}
          myName={user.username}
          mySlackId={user.slackId}
        />
      </div>
    </main>
  )
}
