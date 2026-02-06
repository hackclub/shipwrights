'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Commit {
  sha: string
  msg: string
  author: string
  adds: number
  dels: number
  ts: Date
}

interface Props {
  commits: Commit[]
  repoUrl?: string
}

export function CommitChart({ commits, repoUrl }: Props) {
  if (!commits.length) {
    return <div className="text-gray-500 font-mono text-xs">no commits</div>
  }

  const sorted = [...commits].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

  const parseRepo = (url: string) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    return match ? { owner: match[1], repo: match[2].replace(/\.git$/, '') } : null
  }

  const repo = repoUrl ? parseRepo(repoUrl) : null

  const getCommitUrl = (sha: string) =>
    repo ? `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}` : null

  const CommitLink = ({
    sha,
    children,
    className = '',
  }: {
    sha: string
    children: React.ReactNode
    className?: string
  }) => {
    const url = getCommitUrl(sha)
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    ) : (
      <>{children}</>
    )
  }

  const data = sorted.map((c) => ({
    name: c.sha.slice(0, 7),
    adds: c.adds,
    dels: c.dels,
    sha: c.sha,
  }))

  const CustomTick = (props: any) => {
    const { x, y, payload } = props
    const commit = data.find((d) => d.name === payload.value)
    if (!commit) {
      return (
        <text x={x} y={y + 10} textAnchor="middle" fill="#fff" fontSize={14} fontFamily="monospace">
          {payload.value}
        </text>
      )
    }
    return (
      <CommitLink sha={commit.sha}>
        <text
          x={x}
          y={y + 10}
          textAnchor="middle"
          fill="#22c55e"
          fontSize={14}
          fontFamily="monospace"
          className="cursor-pointer hover:fill-green-300"
          style={{ textDecoration: 'underline', cursor: 'pointer' }}
        >
          {payload.value}
        </text>
      </CommitLink>
    )
  }

  const totalAdds = commits.reduce((s, c) => s + c.adds, 0)
  const totalDels = commits.reduce((s, c) => s + c.dels, 0)

  if (data.length === 1) {
    return (
      <div className="space-y-3">
        <div className="flex gap-4 text-xs font-mono">
          <span className="text-green-400">+{totalAdds}</span>
          <span className="text-red-400">-{totalDels}</span>
          <span className="text-gray-400">{commits.length} commits</span>
        </div>
        <div className="h-20 flex items-center justify-center border border-zinc-700 rounded-lg">
          <div className="text-center font-mono">
            <CommitLink
              sha={data[0].sha}
              className="text-green-500 text-xs hover:text-green-300 underline"
            >
              {data[0].name}
            </CommitLink>
            <div className="flex gap-4 mt-1">
              <span className="text-green-400 text-sm">+{data[0].adds}</span>
              <span className="text-red-400 text-sm">-{data[0].dels}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs font-mono">
        <span className="text-green-400">+{totalAdds}</span>
        <span className="text-red-400">-{totalDels}</span>
        <span className="text-gray-400">{commits.length} commits</span>
      </div>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <XAxis dataKey="name" tick={<CustomTick />} />
            <YAxis tick={{ fontSize: 14, fill: '#fff' }} width={45} />
            <Tooltip
              contentStyle={{
                background: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#a1a1aa' }}
              isAnimationActive={false}
            />
            <Line
              dataKey="adds"
              stroke="#22c55e"
              strokeWidth={0}
              dot={{ r: 5, fill: '#22c55e' }}
              activeDot={{ r: 7, fill: '#22c55e' }}
            />
            <Line
              dataKey="dels"
              stroke="#ef4444"
              strokeWidth={0}
              dot={{ r: 5, fill: '#ef4444' }}
              activeDot={{ r: 7, fill: '#ef4444' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
