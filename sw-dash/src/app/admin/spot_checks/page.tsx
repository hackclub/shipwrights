import { Suspense } from 'react'
import Link from 'next/link'
import Stats from './stats'
import List from './list'

export default function Page() {
  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full">
        <Link
          href="/admin"
          className="text-amber-300/70 hover:text-amber-200 font-mono text-sm mb-6 inline-block"
        >
          ← back
        </Link>

        <div className="mb-6 md:mb-8">
          <Suspense
            fallback={
              <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 animate-pulse h-24"></div>
            }
          >
            <Stats />
          </Suspense>
        </div>

        <div className="mb-6 md:mb-8">
          <h2 className="text-amber-500/70 font-mono text-xs uppercase tracking-wider mb-3 px-2">
            shipwrights
          </h2>
          <Suspense
            fallback={
              <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 animate-pulse h-64"></div>
            }
          >
            <List />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
