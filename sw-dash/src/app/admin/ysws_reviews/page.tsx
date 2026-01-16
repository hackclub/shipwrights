import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { getYsws } from '@/lib/ysws'
import { YswsView } from './ysws-view'

export default async function Ysws() {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.ysws_view)) redirect('/admin')

  const data = await getYsws({ status: 'pending', lbMode: 'weekly' })

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8">
      <div className="w-full">
        <Link
          href="/admin"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back
        </Link>
        <YswsView
          initial={{
            reviews: data.reviews,
            stats: data.stats,
            leaderboard: data.leaderboard,
          }}
        />
      </div>
    </main>
  )
}
