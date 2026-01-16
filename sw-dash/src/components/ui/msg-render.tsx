import React from 'react'

interface Props {
  text: string
  users?: Record<string, string>
}

export function MsgRender({ text, users = {} }: Props) {
  if (!text) return null

  const items: { start: number; end: number; node: React.ReactNode }[] = []

  let m
  const mentionRe = /<@([A-Z0-9]+)>/g
  while ((m = mentionRe.exec(text)) !== null) {
    const id = m[1]
    const name = users[id] || id
    items.push({
      start: m.index,
      end: m.index + m[0].length,
      node: (
        <span key={`m-${m.index}`} className="bg-blue-900/30 text-blue-400 px-1 rounded font-mono">
          @{name}
        </span>
      ),
    })
  }

  items.sort((a, b) => a.start - b.start)

  const parts: React.ReactNode[] = []
  let pos = 0
  for (const item of items) {
    if (item.start < pos) continue
    if (item.start > pos) parts.push(text.slice(pos, item.start))
    parts.push(item.node)
    pos = item.end
  }
  if (pos < text.length) parts.push(text.slice(pos))

  return <>{parts}</>
}
