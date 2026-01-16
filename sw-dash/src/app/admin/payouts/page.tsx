import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import PayoutsTable from './table'

export default async function Payouts() {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.payouts_view)) redirect('/admin')

  const [reqs, stats] = await Promise.all([
    prisma.payoutReq.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: { id: true, username: true, avatar: true, slackId: true, cookieBalance: true },
        },
        admin: { select: { id: true, username: true, avatar: true } },
      },
    }),
    prisma.payoutReq.aggregate({
      _sum: { finalAmount: true, amount: true },
      _count: true,
      where: { status: 'approved' },
    }),
  ])

  const pending = reqs.filter((r) => r.status === 'pending').length
  const totalPaid = stats._sum.finalAmount || stats._sum.amount || 0
  const totalApproved = stats._count || 0

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8">
      <div className="w-full">
        <Link
          href="/admin"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-4xl font-mono text-amber-400">🍪 Payouts</h1>
          <Link
            href="/admin/payouts/logs"
            className="text-cyan-400 hover:text-cyan-300 font-mono text-sm"
          >
            view logs →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-yellow-900/40 rounded-2xl p-4 shadow-xl">
            <div className="text-yellow-400 font-mono text-3xl font-bold">{pending}</div>
            <div className="text-gray-500 font-mono text-xs">pending</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-green-900/40 rounded-2xl p-4 shadow-xl">
            <div className="text-green-400 font-mono text-3xl font-bold">{totalApproved}</div>
            <div className="text-gray-500 font-mono text-xs">approved</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-purple-900/40 rounded-2xl p-4 shadow-xl">
            <div className="text-purple-400 font-mono text-3xl font-bold">
              {totalPaid.toFixed(1)}
            </div>
            <div className="text-gray-500 font-mono text-xs">total paid</div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-cyan-900/40 rounded-2xl p-4 shadow-xl">
            <div className="text-cyan-400 font-mono text-3xl font-bold">{reqs.length}</div>
            <div className="text-gray-500 font-mono text-xs">all time</div>
          </div>
        </div>

        <PayoutsTable reqs={reqs} />
      </div>
    </main>
  )
}
