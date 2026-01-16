import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { getCerts } from '@/lib/certs'
import { CertsView } from './certs-view'

export default async function Ships() {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.certs_view)) redirect('/admin')

  const data = await getCerts({ status: 'pending', lbMode: 'weekly', sortBy: 'oldest' })

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full">
        <Link
          href="/admin"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back
        </Link>
        <CertsView
          initial={{
            certs: data.certifications,
            stats: data.stats,
            leaderboard: data.leaderboard,
            types: data.typeCounts,
          }}
        />
      </div>
    </main>
  )
}
