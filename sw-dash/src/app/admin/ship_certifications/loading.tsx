import Link from 'next/link'

const Box = ({ w = 'w-12', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} bg-zinc-800/40 rounded animate-pulse`} />
)

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

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-mono text-amber-400">Ship Certs</h1>
            <span className="px-2 py-1 rounded font-mono text-xs border bg-yellow-900/30 text-yellow-400 border-yellow-700">
              Pending
            </span>
          </div>
          <div className="flex gap-2">
            <Box w="w-20" h="h-9" />
            <Box w="w-16" h="h-9" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 rounded-2xl p-5 shadow-xl">
            <div className="mb-4">
              <Box w="w-32" h="h-3" />
              <div className="flex gap-3 mt-2">
                <Box w="w-16" h="h-10" />
                <Box w="w-48" h="h-4" />
              </div>
            </div>
            <div className="flex gap-6 pt-4 border-t border-zinc-800">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <Box w="w-20" h="h-3" />
                  <Box w="w-12" h="h-5" />
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 pt-3 border-t border-zinc-800/50">
              {[...Array(4)].map((_, i) => (
                <Box key={i} w="w-20" />
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between mb-3">
              <Box w="w-24" />
              <div className="flex gap-1">
                <Box w="w-14" h="h-6" />
                <Box w="w-16" h="h-6" />
              </div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between py-2 px-2 rounded bg-zinc-900/50 mb-1">
                <Box w="w-16" h="h-3" />
                <Box w="w-6" h="h-3" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between gap-4 mb-6">
          <div className="space-y-3 flex-1">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Box w="w-16" h="h-3" />
                <div className="flex gap-2 mt-2">
                  {[...Array(4)].map((_, j) => (
                    <Box key={j} w="w-20" h="h-9" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="w-64">
            <Box w="w-16" h="h-3" />
            <Box w="w-full" h="h-10" />
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
                  'Claimed By',
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
                    <Box w="w-8" />
                  </td>
                  <td className="p-4">
                    <Box w="w-32" />
                  </td>
                  <td className="p-4">
                    <Box w="w-16" h="h-6" />
                  </td>
                  <td className="p-4">
                    <Box w="w-20" />
                  </td>
                  <td className="p-4">
                    <Box w="w-20" />
                  </td>
                  <td className="p-4">
                    <Box w="w-20" />
                  </td>
                  <td className="p-4">
                    <Box w="w-24" />
                  </td>
                  <td className="p-4">
                    <Box w="w-12" />
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
