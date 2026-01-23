import Image from 'next/image'
import { db } from '@/lib/db'
import { getProfiles } from '@/lib/slack'
import { ShipsBg } from '@/components/ships-bg'

const QUOTES = [
  'gotta ship em all',
  'if it floats, we review it',
  'certifying ships since... recently',
  'no ship left behind',
  'we dont sink ships, we certify em',
]

const ROLE_COLORS: Record<string, string> = {
  megawright: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  shipwright: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  trainee: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  retired: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  ysws_reviewer: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

function color(role: string) {
  return ROLE_COLORS[role.toLowerCase()] || 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

async function load(roles: string | string[]) {
  const users = await db.user.findMany({
    where: {
      isActive: true,
      role: Array.isArray(roles) ? { in: roles } : roles,
    },
    select: { slackId: true, username: true, avatar: true, role: true },
    orderBy: { username: 'asc' },
  })

  const ids = users.map((u) => u.slackId)
  const profiles = await getProfiles(ids)

  return users.map((u) => {
    const s = profiles.get(u.slackId)
    return {
      slackId: u.slackId,
      name: s?.name || u.username,
      title: s?.title || null,
      avatar: s?.avatar || u.avatar,
      pronouns: s?.pronouns || null,
      role: u.role,
    }
  })
}

function Card({
  m,
}: {
  m: {
    slackId: string
    name: string
    title: string | null
    avatar: string | null
    pronouns: string | null
    role: string
  }
}) {
  return (
    <a
      href={`https://hackclub.slack.com/team/${m.slackId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="crew-card flex items-start gap-4 p-5 rounded-xl break-inside-avoid hover:bg-zinc-800/50 transition-colors"
    >
      {m.avatar ? (
        <Image
          src={m.avatar}
          alt=""
          width={64}
          height={64}
          className="w-16 h-16 rounded-lg shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-400 shrink-0">
          {m.name[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white text-lg">{m.name}</span>
          {m.role && (
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${color(m.role)}`}
            >
              {m.role}
            </span>
          )}
        </div>
        {m.title && <div className="text-sm text-zinc-400 mt-1 leading-relaxed">{m.title}</div>}
        {m.pronouns && <div className="text-xs text-zinc-600 mt-2">{m.pronouns}</div>}
      </div>
    </a>
  )
}

export default async function Page() {
  const crew = shuffle(await load(['trainee', 'shipwright', 'megawright']))
  const reviewers = shuffle(await load('ysws_reviewer'))
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]

  return (
    <div className="ocean-bg min-h-screen">
      <ShipsBg />
      <main className="relative z-10 p-4 md:p-8 max-w-[90vw] xl:max-w-[1500px] mx-auto">
        <header className="text-center mb-12 pt-12 md:pt-8 relative">
          <img
            src="/flag-orpheus-top.svg"
            alt=""
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[42%] w-24 md:w-32"
          />
          <div className="flex justify-center mb-4">
            <Image
              src="/logo_nobg_dark.png"
              alt="Shipso Certifico"
              width={160}
              height={160}
              className="w-40 h-40 md:w-48 md:h-48"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">The Shipwrights Crew</h1>
          <p className="text-zinc-500">{crew.length} people certifying your ships</p>
        </header>

        <div className="content-box rounded-2xl p-4 md:p-8">
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5">
            {crew.map((m, i) => (
              <Card key={i} m={m} />
            ))}
          </div>

          {crew.length === 0 && (
            <p className="text-zinc-600 text-center py-12">crew went overboard</p>
          )}
        </div>

        {reviewers.length > 0 && (
          <>
            <header className="text-center mb-8 mt-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white">The YSWS Reviewers</h2>
              <p className="text-zinc-500">{reviewers.length} people reviewing YSWS projects</p>
            </header>

            <div className="content-box rounded-2xl p-4 md:p-8">
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5">
                {reviewers.map((m, i) => (
                  <Card key={i} m={m} />
                ))}
              </div>
            </div>
          </>
        )}

        <div className="content-box rounded-2xl p-4 md:p-8 mt-8">
          <div className="pt-2 text-center">
            <p className="text-zinc-600 italic">"{quote}"</p>
          </div>
        </div>
      </main>
    </div>
  )
}
