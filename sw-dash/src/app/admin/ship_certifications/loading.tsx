import Link from 'next/link'

export default function Loading() {
  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full">
        <Link
          href="/admin"
          className="text-amber-400 font-mono text-sm hover:text-amber-300 transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back
        </Link>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8 min-h-[48px]">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <h1 className="text-2xl md:text-4xl font-mono text-amber-400">Ship Certs</h1>
            <span className="px-2 py-1 rounded font-mono text-xs border bg-zinc-800/50 text-zinc-500 border-zinc-700 min-w-[70px] h-6"></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl min-h-[280px]">
            <div className="h-5 w-20 bg-zinc-800/60 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-24 bg-zinc-800/40 rounded"></div>
                  <div className="h-4 w-12 bg-zinc-800/40 rounded"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-6 shadow-xl min-h-[280px]">
            <div className="h-5 w-24 bg-zinc-800/60 rounded mb-4"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-32 bg-zinc-800/40 rounded"></div>
                  <div className="h-4 w-8 bg-zinc-800/40 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-9 w-20 bg-zinc-900/30 rounded-2xl border-2 border-zinc-800/30"
              ></div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 bg-zinc-900/30 rounded-2xl border-2 border-zinc-800/30"
              ></div>
            ))}
          </div>
        </div>

        <div className="hidden md:block bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-amber-900/30">
                {[
                  'Ship ID',
                  'Project',
                  'Verdict',
                  'Claimed',
                  'Certifier',
                  'Submitter',
                  'Created',
                  'Dev',
                ].map((h) => (
                  <th key={h} className="text-left p-4 text-amber-400 font-mono text-sm">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-amber-900/20">
                  <td className="p-4">
                    <div className="h-4 w-8 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-32 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-6 w-16 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-20 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-20 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-20 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-24 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-12 bg-zinc-800/40 rounded"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
