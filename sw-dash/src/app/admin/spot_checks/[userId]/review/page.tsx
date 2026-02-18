import { Suspense } from 'react'
import Review from './review'

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  return (
    <main className="bg-grid h-screen flex flex-col" role="main">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center font-mono text-amber-400">
            loading...
          </div>
        }
      >
        <Review wrightId={userId} />
      </Suspense>
    </main>
  )
}
