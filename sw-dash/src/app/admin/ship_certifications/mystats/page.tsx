import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { RATES, getBounty } from '@/lib/payouts'
import PayoutModal from './payout-modal'

export default async function Stats() {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.certs_view)) redirect('/admin')

  const uid = user.id

  const now = new Date()
  const day = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - day)
  weekStart.setHours(0, 0, 0, 0)
  const nextSunday = new Date(weekStart)
  nextSunday.setDate(weekStart.getDate() + 7)

  const [
    total,
    approved,
    rejected,
    types,
    global,
    userData,
    weeklyCount,
    cookieLogs,
    pendingPayout,
    approvedPayouts,
  ] = await Promise.all([
    prisma.shipCert.count({ where: { reviewerId: uid } }),
    prisma.shipCert.count({ where: { reviewerId: uid, status: 'approved' } }),
    prisma.shipCert.count({ where: { reviewerId: uid, status: 'rejected' } }),
    prisma.shipCert.groupBy({ by: ['projectType'], where: { reviewerId: uid }, _count: true }),
    prisma.shipCert.groupBy({
      by: ['reviewerId'],
      where: {
        status: { in: ['approved', 'rejected'] },
        reviewCompletedAt: { gte: weekStart, lt: nextSunday },
      },
      _count: true,
      orderBy: { _count: { reviewerId: 'desc' } },
    }),
    prisma.user.findUnique({
      where: { id: uid },
      select: { cookieBalance: true, cookiesEarned: true },
    }),
    prisma.shipCert.count({
      where: {
        reviewerId: uid,
        status: { in: ['approved', 'rejected'] },
        reviewCompletedAt: { gte: weekStart, lt: nextSunday },
      },
    }),
    prisma.shipCert.findMany({
      where: { reviewerId: uid, cookiesEarned: { not: null } },
      orderBy: { reviewCompletedAt: 'desc' },
      take: 15,
      select: {
        id: true,
        projectName: true,
        projectType: true,
        cookiesEarned: true,
        payoutMulti: true,
        reviewCompletedAt: true,
      },
    }),
    prisma.payoutReq.findFirst({
      where: { userId: uid, status: 'pending' },
      select: { amount: true },
    }),
    prisma.payoutReq.findMany({
      where: { userId: uid, status: 'approved' },
      orderBy: { approvedAt: 'desc' },
      take: 10,
      select: { id: true, amount: true, approvedAt: true },
    }),
  ])

  const logs = [
    ...cookieLogs.map((l) => ({
      t: 'earn' as const,
      id: `e${l.id}`,
      name: l.projectName,
      type: l.projectType,
      rate: getBounty(l.projectType),
      multi: l.payoutMulti,
      when: l.reviewCompletedAt,
      amt: l.cookiesEarned,
    })),
    ...approvedPayouts.map((p) => ({
      t: 'payout' as const,
      id: `p${p.id}`,
      name: 'Payout',
      type: null,
      rate: null,
      multi: null,
      when: p.approvedAt,
      amt: -p.amount,
    })),
  ]
    .sort((a, b) => (b.when?.getTime() || 0) - (a.when?.getTime() || 0))
    .slice(0, 15)

  const ago = (d: Date | null) => {
    if (!d) return '-'
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return 'now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  const rate = total > 0 ? Math.round((approved / total) * 100) : 0
  const weeklyRank = global.findIndex((s) => s.reviewerId === uid) + 1
  const maxT = Math.max(...types.map((t) => t._count), 1)

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <Link
          href="/admin/ship_certifications"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back
        </Link>

        <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-mono text-amber-400">{user.username}</h1>
          {weeklyRank > 0 && (
            <span className="px-2 py-1 rounded font-mono text-xs border bg-amber-900/30 text-amber-400 border-amber-700">
              #{weeklyRank} this week
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 flex-1">
              <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl flex flex-col">
                <h2 className="text-amber-400 font-mono text-base md:text-lg mb-4">Your Stats</h2>
                <div className="space-y-3 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono text-sm">Total:</span>
                    <span className="text-white font-mono font-bold">{total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono text-sm">Approved:</span>
                    <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded font-mono text-sm">
                      {approved}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-mono text-sm">Rejected:</span>
                    <span className="bg-red-900/30 text-red-400 px-2 py-1 rounded font-mono text-sm">
                      {rejected}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-700">
                    <span className="text-gray-400 font-mono text-sm">Rate:</span>
                    <span className="text-white font-mono font-bold">{rate}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-green-900/40 rounded-3xl p-4 md:p-6 shadow-xl">
                <h2 className="text-green-400 font-mono text-base md:text-lg mb-4">🍪 Cookies</h2>
                <div className="text-center py-4">
                  <div className="text-5xl font-mono font-bold text-green-400">
                    {userData?.cookieBalance?.toFixed(2) || '0'}
                  </div>
                  <div className="text-gray-500 font-mono text-xs mt-1">balance</div>
                </div>
                {pendingPayout && (
                  <div className="flex justify-between items-center py-2 border-t border-yellow-900/30">
                    <span className="text-yellow-400 font-mono text-sm">pending:</span>
                    <span className="text-yellow-400 font-mono font-bold">
                      {pendingPayout.amount.toFixed(2)} 🍪
                    </span>
                  </div>
                )}
                {!pendingPayout && (
                  <PayoutModal balance={userData?.cookieBalance || 0} logs={cookieLogs} />
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl flex-1">
              <h2 className="text-amber-400 font-mono text-base md:text-lg mb-4">By Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {types
                  .sort((a, b) => b._count - a._count)
                  .slice(0, 6)
                  .map((t) => (
                    <div key={t.projectType} className="bg-zinc-800/50 rounded-xl p-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-white font-mono text-xs truncate">
                          {t.projectType || 'unknown'}
                        </span>
                        <span className="text-amber-400 font-mono text-xs ml-2">{t._count}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-700 rounded-full">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${(t._count / maxT) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                {types.length === 0 && (
                  <div className="text-gray-500 font-mono text-sm col-span-3">none yet</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-purple-900/40 rounded-3xl p-4 md:p-6 shadow-xl">
            <h2 className="text-purple-400 font-mono text-base md:text-lg mb-4">Bounty Rates</h2>
            <div className="space-y-2">
              {Object.entries(RATES)
                .sort((a, b) => b[1] - a[1])
                .map(([type, bounty]) => (
                  <div
                    key={type}
                    className="flex justify-between text-sm font-mono py-1 border-b border-purple-900/20 last:border-0"
                  >
                    <span className="text-gray-300">{type}</span>
                    <span className="text-purple-300 font-bold">{bounty} 🍪</span>
                  </div>
                ))}
            </div>
            <div className="bg-purple-900/20 rounded-xl p-3 mt-4">
              <div className="text-purple-300 font-mono text-xs font-bold mb-2">Multipliers</div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400">1st on lb:</span>
                  <span className="text-purple-300">1.75x bounty</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">2nd on lb:</span>
                  <span className="text-purple-300">1.5x bounty</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">3rd on lb:</span>
                  <span className="text-purple-300">1.25x bounty</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">4th+ on lb:</span>
                  <span className="text-purple-300">1x bounty</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-cyan-900/40 rounded-3xl p-4 md:p-6 shadow-xl mt-6">
          <h2 className="text-cyan-400 font-mono text-base md:text-lg mb-4">Cookie Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-900/30">
                  <th className="text-left p-3 text-cyan-400 font-mono text-xs">project</th>
                  <th className="text-left p-3 text-cyan-400 font-mono text-xs">type</th>
                  <th className="text-right p-3 text-cyan-400 font-mono text-xs">rate</th>
                  <th className="text-right p-3 text-cyan-400 font-mono text-xs">multi</th>
                  <th className="text-right p-3 text-cyan-400 font-mono text-xs">when</th>
                  <th className="text-right p-3 text-cyan-400 font-mono text-xs">cookies</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr
                    key={l.id}
                    className={`border-b border-cyan-900/20 hover:bg-cyan-950/20 ${l.t === 'payout' ? 'bg-red-950/10' : ''}`}
                  >
                    <td className="p-3 text-white font-mono text-sm">{l.name || '-'}</td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{l.type || '-'}</td>
                    <td className="p-3 text-right text-amber-400 font-mono text-xs">
                      {l.rate ?? '-'}
                    </td>
                    <td className="p-3 text-right text-purple-400 font-mono text-xs">
                      {l.multi ? `${l.multi}x` : '-'}
                    </td>
                    <td className="p-3 text-right text-gray-500 font-mono text-xs">
                      {ago(l.when)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono text-sm font-bold ${l.amt && l.amt > 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {l.amt && l.amt > 0 ? '+' : ''}
                      {l.amt?.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 font-mono">
                      no cookies yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
