import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/server-auth'
import { can, PERMS } from '@/lib/perms'
import Wip from '@/components/ui/wip'
import { Crew } from '@/components/admin/crew'
import { ErrorBanner } from '@/components/admin/error-banner'
import { ProfileCard } from '@/components/admin/profile-card'
import { prisma } from '@/lib/db'

export default async function Admin() {
  const user = await getUser()
  if (!user) redirect('/')

  const [pendingCerts, pendingYsws] = await Promise.all([
    prisma.shipCert.count({ where: { status: 'pending' } }),
    prisma.yswsReview.count({ where: { status: 'pending' } }),
  ])

  return (
    <main
      className="bg-grid min-h-screen w-full flex flex-col items-center justify-center overflow-hidden p-4 md:p-8"
      role="main"
      aria-label="admin dashboard"
    >
      <Crew />
      <ErrorBanner />

      <div className="max-w-4xl w-full">
        <div className="mb-8 md:mb-16">
          <ProfileCard
            user={{ id: user.id, username: user.username, avatar: user.avatar, role: user.role }}
          />
        </div>

        {(can(user.role, PERMS.users_view) ||
          can(user.role, PERMS.eng_full) ||
          can(user.role, PERMS.logs_full)) && (
          <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
            <h3 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider mb-3 px-2">
              admin stuff
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {can(user.role, PERMS.users_view) && (
                <Link
                  href="/admin/users"
                  className="bg-orange-500/10 border-2 border-dashed border-orange-500 hover:border-orange-400 text-orange-400 hover:text-orange-300 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-orange-500/20 text-center shadow-lg shadow-orange-950/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  🔨 manage users
                </Link>
              )}

              {can(user.role, PERMS.logs_full) && (
                <Link
                  href="/admin/logs"
                  className="bg-red-500/10 border-2 border-dashed border-red-500 hover:border-red-400 text-red-400 hover:text-red-300 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-red-500/20 text-center shadow-lg shadow-red-950/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  📊 system logs
                </Link>
              )}
              {can(user.role, PERMS.payouts_view) && (
                <Link
                  href="/admin/payouts"
                  className="bg-green-500/10 border-2 border-dashed border-green-600 hover:border-green-400 text-green-400 hover:text-green-300 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-green-500/20 text-center shadow-lg shadow-green-950/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  🍪 payouts
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
          <h3 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider mb-3 px-2">
            my stuff
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Link
              href={`/user/${user.id}`}
              className="bg-purple-500/10 border-2 border-dashed border-purple-500 hover:border-purple-400 text-purple-400 hover:text-purple-300 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-purple-500/20 text-center shadow-lg shadow-purple-950/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Settings
            </Link>
            {can(user.role, PERMS.certs_edit) && (
              <Link
                href="/admin/ship_certifications/mystats"
                className="bg-blue-500/10 border-2 border-dashed border-blue-500 hover:border-blue-400 text-blue-400 hover:text-blue-300 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-blue-500/20 text-center shadow-lg shadow-blue-950/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                Certs Stats
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
          <h3 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider mb-3 px-2">
            certifications stuff
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {can(user.role, PERMS.certs_view) && (
              <div className="relative">
                <Link
                  href="/admin/ship_certifications"
                  className="block w-full bg-zinc-950/50 border-2 border-amber-800/40 hover:border-amber-600/60 text-amber-200 hover:text-amber-100 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-zinc-900/70 text-center shadow-lg shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Ship Certifications
                </Link>
                {pendingCerts > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {pendingCerts}
                  </span>
                )}
              </div>
            )}
            {can(user.role, PERMS.ysws_view) && (
              <div className="relative">
                <Link
                  href="/admin/ysws_reviews"
                  className="block w-full bg-zinc-950/50 border-2 border-amber-800/40 hover:border-amber-600/60 text-amber-200 hover:text-amber-100 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-zinc-900/70 text-center shadow-lg shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  YSWS Reviews
                </Link>
                {pendingYsws > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {pendingYsws}
                  </span>
                )}
              </div>
            )}
            {can(user.role, PERMS.assign_view) && (
              <div className="relative">
                <Link
                  href="/admin/assignments"
                  className="block w-full bg-zinc-950/50 border-2 border-amber-800/40 hover:border-amber-600/60 text-amber-200 hover:text-amber-100 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-zinc-900/70 text-center shadow-lg shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Assignments
                </Link>
                <Wip />
              </div>
            )}
            {can(user.role, PERMS.support_view) && (
              <div className="relative">
                <Link
                  href="/admin/tickets"
                  className="block w-full bg-zinc-950/50 border-2 border-amber-800/40 hover:border-amber-600/60 text-amber-200 hover:text-amber-100 font-mono text-sm px-4 md:px-6 py-3 rounded-2xl transition-all duration-200 hover:bg-zinc-900/70 text-center shadow-lg shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Support Tickets
                </Link>
                <Wip />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
