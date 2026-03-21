import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { getCerts } from '@/lib/certs'
import { CertsView } from './certs-view'

type PageProps = { searchParams: Promise<{ returned?: string }> }

export default async function Ships({ searchParams }: PageProps) {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.certs_view)) redirect('/admin')

  const params = await searchParams
  const returnedOnly = params.returned === '1'
  if (returnedOnly && !can(user.role, PERMS.captain_dashboard)) {
    redirect('/admin/captain')
  }

  const data = await getCerts({
    status: 'pending',
    lbMode: 'weekly',
    sortBy: 'oldest',
    returnedOnly: returnedOnly || undefined,
  })

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full">
        <Link
          href={returnedOnly ? '/admin/captain' : '/admin'}
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
          showReturnedByAdmin={can(user.role, PERMS.captain_dashboard)}
          isReturnedView={returnedOnly}
        />
      </div>
    </main>
  )
}
