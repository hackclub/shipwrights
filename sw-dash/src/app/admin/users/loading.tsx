import Link from 'next/link'

export default function Loading() {
  return (
    <main className="bg-grid min-h-screen w-full p-4 md:p-8" role="main">
      <div className="w-full px-2 md:px-4">
        <Link
          href="/admin"
          className="text-amber-300/70 hover:text-amber-200 font-mono text-sm transition-colors mb-4 md:mb-6 inline-flex items-center gap-2"
        >
          ← back to admin
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 rounded-2xl p-3 w-full md:w-72">
            <div className="h-9 bg-zinc-950/50 border-2 border-amber-900/30 rounded-xl"></div>
            <div className="h-4 w-20 bg-zinc-800/30 rounded mt-2"></div>
          </div>
        </div>

        <div className="hidden lg:block bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead className="border-b-2 border-amber-900/40">
              <tr className="bg-zinc-900/50">
                {['ID', 'USER', 'SLACK', 'ROLE', 'STATUS', 'JOINED', 'ACTION'].map((h) => (
                  <th key={h} className="text-left text-amber-400 font-mono text-sm px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-amber-900/20">
                  <td className="px-4 py-3">
                    <div className="h-4 w-8 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 w-16 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 w-14 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 bg-zinc-800/40 rounded"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 w-16 bg-zinc-800/40 rounded"></div>
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
