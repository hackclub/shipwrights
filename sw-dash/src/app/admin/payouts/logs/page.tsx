import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { RATES } from '@/lib/payouts'

export default async function Logs() {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.payouts_view)) redirect('/admin')

  const certs = await prisma.shipCert.findMany({
    where: {
      cookiesEarned: { not: null },
      reviewerId: { not: null },
    },
    orderBy: { reviewCompletedAt: 'desc' },
    select: {
      id: true,
      projectName: true,
      projectType: true,
      cookiesEarned: true,
      payoutMulti: true,
      reviewCompletedAt: true,
      reviewer: { select: { id: true, username: true, avatar: true } },
    },
    take: 200,
  })

  const ago = (d: Date | null) => {
    if (!d) return '-'
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return 'now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  const getRate = (type: string | null) => (type ? (RATES[type] ?? 1) : 1)

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8">
      <div className="w-full">
        <Link
          href="/admin/payouts"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 mb-4 inline-flex items-center gap-2"
        >
          ← payouts
        </Link>

        <h1 className="text-2xl md:text-4xl font-mono text-amber-400 mb-6">🍪 Cookie Log</h1>

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl shadow-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-amber-900/30 bg-zinc-900/50">
                <th className="text-left p-4 text-amber-400 font-mono text-sm">project</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">reviewer</th>
                <th className="text-left p-4 text-amber-400 font-mono text-sm">type</th>
                <th className="text-right p-4 text-amber-400 font-mono text-sm">base rate</th>
                <th className="text-right p-4 text-amber-400 font-mono text-sm">eff. multi</th>
                <th className="text-right p-4 text-amber-400 font-mono text-sm">when</th>
                <th className="text-right p-4 text-amber-400 font-mono text-sm">cookies</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id} className="border-b border-amber-900/20 hover:bg-amber-950/20">
                  <td className="p-4 text-white font-mono text-sm">{c.projectName || '-'}</td>
                  <td className="p-4 text-purple-400 font-mono text-sm">
                    {c.reviewer?.username || '-'}
                  </td>
                  <td className="p-4 text-cyan-400 font-mono text-xs">{c.projectType || '-'}</td>
                  <td className="p-4 text-right text-orange-400 font-mono text-sm">
                    {getRate(c.projectType)}
                  </td>
                  <td className="p-4 text-right text-yellow-400 font-mono text-sm">
                    {c.payoutMulti || 1}x
                  </td>
                  <td className="p-4 text-right text-gray-500 font-mono text-xs">
                    {ago(c.reviewCompletedAt)}
                  </td>
                  <td className="p-4 text-right text-green-400 font-mono text-sm font-bold">
                    +{c.cookiesEarned?.toFixed(2)}
                  </td>
                </tr>
              ))}
              {certs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 font-mono">
                    no cookies earned yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
