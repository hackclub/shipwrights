import React from 'react'

interface Props {
  text: string
  users?: Record<string, string>
}

const SLACK_LINK_RE = /<(https?:\/\/[^|>\s]+)\|([^>]+)>/g
const SLACK_URL_RE = /<(https?:\/\/[^>\s]+)>/g
const PLAIN_URL_RE = /https?:\/\/[^\s<>]+/g
const MENTION_RE = /<@([A-Z0-9]+)>/g
const EMOJI_RE = /:([a-zA-Z0-9_\-+]+):/g

function formatText(s: string, prefix: string): React.ReactNode {
  const re = /(\*[^*\n]+\*)|(_[^_\n]+_)|(`[^`\n]+`)|(~[^~\n]+~)/g
  const parts: React.ReactNode[] = []
  let last = 0,
    i = 0
  let m
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index))
    if (m[1]) parts.push(<strong key={`${prefix}-b${i++}`}>{m[1].slice(1, -1)}</strong>)
    else if (m[2]) parts.push(<em key={`${prefix}-i${i++}`}>{m[2].slice(1, -1)}</em>)
    else if (m[3])
      parts.push(
        <code
          key={`${prefix}-c${i++}`}
          className="bg-zinc-800 px-1 rounded text-amber-300 font-mono text-xs"
        >
          {m[3].slice(1, -1)}
        </code>
      )
    else if (m[4]) parts.push(<del key={`${prefix}-s${i++}`}>{m[4].slice(1, -1)}</del>)
    last = m.index + m[0].length
  }
  if (last < s.length) parts.push(s.slice(last))
  if (parts.length === 0) return s
  if (parts.length === 1 && typeof parts[0] === 'string') return parts[0]
  return <React.Fragment key={prefix}>{parts}</React.Fragment>
}

export function MsgRender({ text, users = {} }: Props) {
  if (!text) return null

  const items: { start: number; end: number; node: React.ReactNode }[] = []
  let m

  const slackLinkRe = new RegExp(SLACK_LINK_RE.source, 'g')
  while ((m = slackLinkRe.exec(text)) !== null) {
    items.push({
      start: m.index,
      end: m.index + m[0].length,
      node: (
        <a
          key={`sl-${m.index}`}
          href={m[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline hover:text-blue-300"
        >
          {m[2]}
        </a>
      ),
    })
  }

  const slackUrlRe = new RegExp(SLACK_URL_RE.source, 'g')
  while ((m = slackUrlRe.exec(text)) !== null) {
    if (items.some((i) => m!.index >= i.start && m!.index < i.end)) continue
    items.push({
      start: m.index,
      end: m.index + m[0].length,
      node: (
        <a
          key={`su-${m.index}`}
          href={m[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline hover:text-blue-300 break-all"
        >
          {m[1]}
        </a>
      ),
    })
  }

  const urlRe = new RegExp(PLAIN_URL_RE.source, 'g')
  while ((m = urlRe.exec(text)) !== null) {
    if (items.some((i) => m!.index >= i.start && m!.index < i.end)) continue
    items.push({
      start: m.index,
      end: m.index + m[0].length,
      node: (
        <a
          key={`u-${m.index}`}
          href={m[0]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline hover:text-blue-300 break-all"
        >
          {m[0]}
        </a>
      ),
    })
  }

  const mentionRe = new RegExp(MENTION_RE.source, 'g')
  while ((m = mentionRe.exec(text)) !== null) {
    if (items.some((i) => m!.index >= i.start && m!.index < i.end)) continue
    const name = users[m[1]] || m[1]
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

  const emojiRe = new RegExp(EMOJI_RE.source, 'g')
  while ((m = emojiRe.exec(text)) !== null) {
    if (items.some((i) => m!.index >= i.start && m!.index < i.end)) continue
    items.push({
      start: m.index,
      end: m.index + m[0].length,
      node: (
        <img
          key={`e-${m.index}`}
          src={`https://cachet.dunkirk.sh/emojis/${m[1]}/r`}
          alt={`:${m[1]}:`}
          className="inline-block w-5 h-5 align-middle"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.insertAdjacentText('afterend', `:${m![1]}:`)
          }}
        />
      ),
    })
  }

  items.sort((a, b) => a.start - b.start)

  const parts: React.ReactNode[] = []
  let pos = 0
  for (const item of items) {
    if (item.start < pos) continue
    if (item.start > pos) parts.push(formatText(text.slice(pos, item.start), `pre${pos}`))
    parts.push(item.node)
    pos = item.end
  }
  if (pos < text.length) parts.push(formatText(text.slice(pos), `suf${pos}`))

  return <>{parts}</>
}
