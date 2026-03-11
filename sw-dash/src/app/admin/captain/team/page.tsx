import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import { Crew } from '@/components/admin/crew'
import { ErrorBanner } from '@/components/admin/error-banner'
import { ProfileCard } from '@/components/admin/profile-card'

export default async function CaptainTeamPage() {
  const user = await getUser()
  if (!user) redirect('/')
  if (!can(user.role, PERMS.captain_dashboard)) redirect('/admin')

  return (
    <main
      className="bg-grid min-h-screen w-full flex flex-col items-center overflow-hidden p-4 md:p-8"
      role="main"
      aria-label="Captain team"
    >
      <Crew />
      <ErrorBanner />

      <div className="max-w-4xl w-full">
        <div className="mb-6 md:mb-8">
          <ProfileCard
            user={{ id: user.id, username: user.username, avatar: user.avatar, role: user.role }}
          />
        </div>

        <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
          <h3 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider mb-3 px-2">
            Captain → Team
          </h3>
          <div className="bg-zinc-900/90 border-2 border-amber-900/40 rounded-2xl p-6">
            <p className="font-mono text-amber-300/80 mb-4">
              Team view: reviewer list and load. (Coming soon.)
            </p>
            <Link
              href="/admin/captain"
              className="font-mono text-sm text-amber-400 hover:text-amber-300"
            >
              ← Back to Overview
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
