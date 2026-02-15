import { Suspense } from 'react'
import Link from 'next/link'
import Case from './case'

export default async function Page({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params

  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full max-w-6xl mx-auto">
        <Link
          href="/admin/spot_checks"
          className="text-amber-300/70 hover:text-amber-200 font-mono text-sm mb-6 inline-block"
        >
          ← back
        </Link>

        <Suspense
          fallback={
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 animate-pulse h-96"></div>
          }
        >
          <Case caseId={caseId} />
        </Suspense>
      </div>
    </main>
  )
}
