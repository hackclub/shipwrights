import Image from 'next/image'
import { ShipsBg } from '@/components/ships-bg'
import { FAQ } from './qna'

export default function Page() {
  return (
    <div className="ocean-bg min-h-screen">
      <ShipsBg />
      <main className="relative z-10 p-4 md:p-8 max-w-[90vw] xl:max-w-[1200px] mx-auto">
        <header className="text-center mb-12 pt-12 md:pt-8 relative">
          <img
            src="/flag-orpheus-top.svg"
            alt=""
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[42%] w-24 md:w-32"
          />
          <div className="flex justify-center mb-4">
            <Image
              src="/logo_nobg_dark.png"
              alt="Shipwrights"
              width={160}
              height={160}
              className="w-40 h-40 md:w-48 md:h-48"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">FAQ</h1>
          <p className="text-zinc-500">got questions? we got answers!</p>
        </header>

        <div className="space-y-8">
          {Object.entries(FAQ).map(([category, items]) => (
            <div key={category} className="space-y-5">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">{category}</h2>
              {items.map((item, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/60 border border-zinc-700/50 rounded-xl p-7 hover:border-cyan-500/30 transition-all backdrop-blur-sm"
                >
                  <h3 className="text-xl font-bold text-cyan-400 mb-4">{item.q}</h3>
                  <div className="text-zinc-100 leading-relaxed text-base space-y-2">
                    {item.a.split('\n').map((line, j) => (
                      <p key={j}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="mt-10 pt-8 border-t border-zinc-700 text-center">
            <p className="text-zinc-400 text-base">
              Don't see your question?{' '}
              <a
                href="https://hackclub.enterprise.slack.com/archives/C099P9FQQ91"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium underline decoration-cyan-400/30 hover:decoration-cyan-300/50"
              >
                Message Shipwrights Team on Slack!
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
