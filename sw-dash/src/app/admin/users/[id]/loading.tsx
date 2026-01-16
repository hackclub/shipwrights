import Link from 'next/link'

export default function Loading() {
  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full px-2 md:px-4">
        <div className="h-4 w-32 bg-zinc-800/40 rounded mb-4 md:mb-6"></div>
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 mb-6 min-h-[140px]">
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-zinc-800/50"></div>
            <div className="flex-1">
              <div className="h-7 w-48 bg-zinc-800/50 rounded mb-3"></div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                <div className="h-4 w-24 bg-zinc-800/40 rounded"></div>
                <div className="h-5 w-20 bg-zinc-800/30 rounded"></div>
              </div>
              <div className="h-3 w-32 bg-zinc-800/20 rounded"></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 min-h-[180px]"
            >
              <div className="h-4 w-28 bg-zinc-800/50 rounded mb-3"></div>
              <div className="space-y-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-9 w-full bg-zinc-800/30 rounded-xl"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 min-h-[200px]">
          <div className="h-4 w-32 bg-zinc-800/50 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900/50 border-2 border-amber-900/30 p-3 rounded-2xl min-h-[80px]"
              >
                <div className="h-3 w-20 bg-zinc-800/40 rounded mb-2"></div>
                <div className="h-8 w-12 bg-zinc-800/50 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
