'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

interface Note {
  id: number
  text: string
  certId: number | null
  ticketId: number | null
  createdAt: string
  staff: string
  staffSlackId: string
  staffRole: string
  staffAvatar: string | null
}

interface Ticket {
  id: number
  status: string
  createdAt: string
}

interface Profile {
  name: string | null
  avatar: string | null
  slackId: string
}

interface Props {
  slackId: string
  username: string
  className?: string
}

export function SubmitterCard({ slackId, username, className }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteCert, setNoteCert] = useState('')
  const [noteTicket, setNoteTicket] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/submitter/${slackId}`)
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile)
        setNotes(d.notes)
        setTickets(d.tickets)
      })
      .catch(() => {})
  }, [slackId])

  const postNote = async () => {
    if (!noteText.trim()) return
    setPosting(true)
    const res = await fetch(`/api/admin/submitter/${slackId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: noteText,
        certId: noteCert || null,
        ticketId: noteTicket || null,
      }),
    })
    const d = await res.json()
    if (d.note) {
      setNotes((prev) => [d.note, ...prev])
      setNoteText('')
      setNoteCert('')
      setNoteTicket('')
      setNoteOpen(false)
    }
    setPosting(false)
  }

  const deleteNote = async (id: number) => {
    await fetch(`/api/admin/submitter/${slackId}/notes/${id}`, { method: 'DELETE' })
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <>
      <div
        className={`bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-xl shadow-amber-950/20 w-[800px] ${className ?? ''}`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-10 h-10 shrink-0">
            {profile?.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.name || username}
                fill
                className="rounded-full object-cover border-2 border-amber-800/40"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-amber-800/40 flex items-center justify-center text-amber-400 font-mono text-sm">
                {username[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="text-white font-mono text-sm font-bold">
              {profile?.name || username}
            </div>
            <a
              href={`https://hackclub.slack.com/team/${slackId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 font-mono text-xs hover:text-amber-400 transition-colors"
            >
              {slackId} ↗
            </a>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-3 mb-3">
          <div className="text-gray-500 font-mono text-xs mb-2">tickets</div>
          {tickets.length === 0 ? (
            <div className="text-gray-600 font-mono text-xs">none</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tickets.map((t) => (
                <a
                  key={t.id}
                  href={`/admin/tickets/sw-${t.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-mono text-xs transition-colors ${
                    t.status === 'open'
                      ? 'bg-green-950/40 border-green-700/50 text-green-400 hover:bg-green-950/60'
                      : 'bg-zinc-900/60 border-zinc-700/50 text-gray-400 hover:bg-zinc-900'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${t.status === 'open' ? 'bg-green-400' : 'bg-gray-500'}`}
                  />
                  sw-{t.id}
                  <span className="text-gray-500 capitalize">{t.status}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-500 font-mono text-xs">notes</div>
            <button
              onClick={() => setNoteOpen(true)}
              className="text-amber-500 hover:text-amber-400 font-mono text-xs transition-colors"
            >
              + add
            </button>
          </div>
          {notes.length === 0 ? (
            <div className="text-gray-600 font-mono text-xs">nothing yet</div>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-amber-400 font-mono text-xs font-bold">@{n.staff}</span>
                      <span className="text-gray-600 font-mono text-xs">({n.staffSlackId})</span>
                      <span className="text-gray-500 font-mono text-xs">|</span>
                      <span className="text-blue-400/80 font-mono text-xs">{n.staffRole}</span>
                    </div>
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="text-red-500 hover:text-red-400 font-mono text-xs transition-colors shrink-0 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-gray-300 font-mono text-xs whitespace-pre-wrap mb-1.5">
                    {n.text}
                  </p>
                  {(n.certId || n.ticketId) && (
                    <div className="flex gap-3 text-xs font-mono">
                      {n.certId && (
                        <span className="text-gray-500">
                          cert:{' '}
                          <a
                            href={`/admin/ship_certifications/${n.certId}/edit`}
                            className="text-amber-600 hover:text-amber-500"
                          >
                            #{n.certId}
                          </a>
                        </span>
                      )}
                      {n.ticketId && (
                        <span className="text-gray-500">
                          ticket:{' '}
                          <a
                            href={`/admin/tickets/sw-${n.ticketId}`}
                            className="text-blue-500 hover:text-blue-400"
                          >
                            sw-{n.ticketId}
                          </a>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {noteOpen && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border-2 border-amber-900/50 rounded-2xl p-5 w-full max-w-md shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-amber-400 font-mono text-sm font-bold">new note</div>
                <div className="text-gray-600 font-mono text-xs">for {username}</div>
              </div>
              <button
                onClick={() => setNoteOpen(false)}
                className="text-gray-500 hover:text-white font-mono text-lg leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="what's the tea..."
              className="w-full bg-zinc-900 border-2 border-zinc-800 focus:border-amber-800/60 text-white font-mono text-sm p-3 rounded-xl focus:outline-none min-h-[120px] resize-none mb-4 transition-colors"
              autoFocus
            />

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <div className="text-gray-600 font-mono text-xs mb-1 pl-1">cert ID</div>
                <input
                  type="number"
                  value={noteCert}
                  onChange={(e) => setNoteCert(e.target.value)}
                  placeholder="optional"
                  className="w-full bg-zinc-900 border-2 border-zinc-800 focus:border-amber-800/60 text-white font-mono text-sm p-2 rounded-xl focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <div className="text-gray-600 font-mono text-xs mb-1 pl-1">ticket ID</div>
                <div className="flex items-center bg-zinc-900 border-2 border-zinc-800 focus-within:border-amber-800/60 rounded-xl transition-colors overflow-hidden">
                  <span className="text-gray-500 font-mono text-sm px-2 shrink-0">sw-</span>
                  <input
                    type="number"
                    value={noteTicket}
                    onChange={(e) => setNoteTicket(e.target.value)}
                    placeholder="optional"
                    className="flex-1 bg-transparent text-white font-mono text-sm py-2 pr-2 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setNoteOpen(false)}
                className="flex-1 bg-zinc-900 text-gray-400 border-2 border-zinc-800 font-mono text-sm py-2.5 rounded-xl hover:bg-zinc-800 hover:text-white transition-all"
              >
                cancel
              </button>
              <button
                onClick={postNote}
                disabled={!noteText.trim() || posting}
                className="flex-1 bg-amber-900/40 text-amber-300 border-2 border-amber-800/50 font-mono text-sm py-2.5 rounded-xl hover:bg-amber-900/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {posting ? 'posting...' : 'post note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
