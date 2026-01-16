export default function Loading() {
  return (
    <main
      className="bg-grid min-h-screen w-full flex flex-col items-center justify-center overflow-hidden p-4 md:p-8"
      role="main"
    >
      <div className="max-w-4xl w-full">
        <div className="mb-8 md:mb-16">
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 md:p-8 max-w-md mx-auto min-h-[200px]">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-800/50 mr-3 md:mr-4"></div>
              <div className="flex-1">
                <div className="h-6 w-32 bg-zinc-800/50 rounded mb-2"></div>
                <div className="h-4 w-24 bg-zinc-800/30 rounded mb-2"></div>
                <div className="h-5 w-16 bg-zinc-800/40 rounded"></div>
              </div>
            </div>
            <div className="h-10 w-full bg-zinc-800/30 rounded-2xl mt-4"></div>
          </div>
        </div>
        <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
          <div className="h-3 w-16 bg-zinc-800/30 rounded mb-3"></div>
          <div className="h-12 w-full bg-zinc-800/30 rounded-2xl"></div>
        </div>
        <div className="mb-6 md:mb-8 max-w-2xl mx-auto">
          <div className="h-3 w-24 bg-zinc-800/30 rounded mb-3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-800/30 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
