import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { AnalyticsView } from './analytics-view'

export default async function Analytics() {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.analytics_view)) redirect('/admin')

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full">
        <Link
          href="/admin"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back
        </Link>
        <AnalyticsView />
      </div>
    </main>
  )
}
