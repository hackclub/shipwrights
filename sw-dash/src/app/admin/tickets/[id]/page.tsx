'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MsgRender } from '@/components/ui/msg-render'
import { can, PERMS } from '@/lib/perms'
import { useTicket, Msg } from '@/hooks/useTicket'
import { useTicketActions } from '@/hooks/useTicketActions'

export default function TicketDetail() {
  const params = useParams()
  const ticketId = params.id as string

  const { ticket, setTicket, user, botOk, load } = useTicket(ticketId)
  const {
    reply,
    setReply,
    sending,
    files,
    setFiles,
    note,
    setNote,
    addingNote,
    assigning,
    searchQuery,
    setSearchQuery,
    showDropdown,
    setShowDropdown,
    filteredStaff,
    sendReply,
    addAssignee,
    removeAssignee,
    closeTicket,
    addNote,
  } = useTicketActions({ ticketId, ticket, setTicket, user, load })

  const [lightbox, setLightbox] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages])

  const skel = () => (
    <main className="h-screen bg-grid overflow-hidden" role="main">
      <div className="hidden md:flex h-full flex-col p-4">
        <div className="h-4 w-32 bg-zinc-800/40 rounded mb-3"></div>
        <div className="flex-1 flex gap-4 min-h-0">
          <div className="w-72 flex-shrink-0">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 min-h-[400px]">
              <div className="h-4 w-24 bg-zinc-800/50 rounded mb-3"></div>
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <div className="h-3 w-12 bg-zinc-800/30 rounded mb-1"></div>
                    <div className="h-4 w-full bg-zinc-800/40 rounded"></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t-2 border-yellow-900/40">
                <div className="h-3 w-16 bg-zinc-800/40 rounded mb-2"></div>
                <div className="h-3 w-full bg-zinc-800/30 rounded mb-1"></div>
                <div className="h-3 w-3/4 bg-zinc-800/30 rounded"></div>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl h-full flex flex-col">
              <div className="flex-1 p-4 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-800/40"></div>
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-zinc-800/40 rounded mb-2"></div>
                      <div className="h-3 w-full max-w-md bg-zinc-800/30 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-amber-900/40 p-3">
                <div className="flex gap-2">
                  <div className="h-10 w-10 bg-zinc-800/40 rounded-xl"></div>
                  <div className="flex-1 h-10 bg-zinc-800/30 rounded-xl"></div>
                  <div className="h-10 w-16 bg-zinc-800/40 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-96 flex-shrink-0">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4">
              <div className="h-4 w-28 bg-zinc-800/50 rounded mb-3"></div>
              <div className="space-y-2 mb-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-black/50 border border-amber-900/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-zinc-800/40"></div>
                      <div className="h-3 w-16 bg-zinc-800/40 rounded"></div>
                      <div className="h-3 w-24 bg-zinc-800/30 rounded ml-auto"></div>
                    </div>
                    <div className="h-3 w-full bg-zinc-800/30 rounded"></div>
                  </div>
                ))}
              </div>
              <div className="h-20 w-full bg-zinc-800/30 rounded-xl mb-2"></div>
              <div className="h-10 w-full bg-zinc-800/40 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="md:hidden h-full flex flex-col p-3">
        <div className="h-4 w-16 bg-zinc-800/40 rounded mb-2"></div>
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-3 mb-3 min-h-[120px]">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800/40"></div>
              <div>
                <div className="h-4 w-20 bg-zinc-800/40 rounded mb-1"></div>
                <div className="h-3 w-16 bg-zinc-800/30 rounded"></div>
              </div>
            </div>
            <div className="h-5 w-12 bg-zinc-800/40 rounded"></div>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl"></div>
      </div>
    </main>
  )

  if (!ticket) return skel()

  return (
    <main className="h-screen bg-grid overflow-hidden" role="main">
      {!botOk && (
        <div className="fixed top-0 left-0 right-0 bg-red-900/50 border-b border-red-700 p-3 text-center z-50">
          <p className="text-red-300 font-mono text-sm">
            lost connection with a bot.. might be temporary or not.. If this isn&apos;t gone within
            5 mins, let admins know!
          </p>
        </div>
      )}

      <div className="md:hidden h-full flex flex-col p-3">
        <Link href="/admin/tickets" className="text-amber-400 font-mono text-sm mb-2 inline-block">
          ← back
        </Link>

        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-3 mb-3 shadow-2xl shadow-amber-950/30">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                {ticket.userAvatar ? (
                  <Image
                    src={ticket.userAvatar}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                    alt={ticket.userName}
                  />
                ) : (
                  <span className="text-amber-400 font-mono text-sm">{ticket.userName[0]}</span>
                )}
              </div>
              <div>
                <div className="text-amber-200 font-mono text-sm">{ticket.userName}</div>
                <div className="text-amber-300/60 font-mono text-xs">sw-{ticket.id}</div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-xl border-2 font-mono text-xs ${ticket.status === 'open' ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-amber-900/30 text-amber-300/70 border-amber-700'}`}
            >
              {ticket.status}
            </span>
          </div>
          <div className="text-amber-200 font-mono text-xs mb-2 line-clamp-2">
            {ticket.question}
          </div>

          {can(user?.role || '', PERMS.support_edit) && (
            <div className="mb-2">
              <div className="flex gap-1 flex-wrap mb-1">
                {ticket.assignees && ticket.assignees.length > 0 ? (
                  ticket.assignees.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => removeAssignee(a.id)}
                      disabled={assigning}
                      className="text-amber-200 font-mono text-xs bg-amber-900/40 px-2 py-0.5 rounded border border-amber-700 flex items-center gap-1"
                    >
                      {a.username}
                      <span className="text-red-400">×</span>
                    </button>
                  ))
                ) : (
                  <span className="text-amber-300/60 font-mono text-xs">no one assigned</span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="add assignee..."
                  className="w-full bg-black/50 border border-amber-900/40 rounded px-2 py-1 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-700"
                />
                {showDropdown && filteredStaff.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-black/95 border border-amber-700 rounded max-h-32 overflow-y-auto z-50">
                    {filteredStaff.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addAssignee(s.id)}
                        className="w-full text-left px-2 py-1 text-amber-200 font-mono text-xs hover:bg-amber-900/30"
                      >
                        {s.username}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!can(user?.role || '', PERMS.support_edit) && (
            <div className="flex gap-1 flex-wrap mb-2">
              {ticket.assignees && ticket.assignees.length > 0 ? (
                ticket.assignees.map((a) => (
                  <span
                    key={a.id}
                    className="text-amber-300/60 font-mono text-xs bg-amber-900/20 px-2 py-0.5 rounded border border-amber-700/30"
                  >
                    {a.username}
                  </span>
                ))
              ) : (
                <span className="text-amber-300/60 font-mono text-xs">unassigned</span>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs items-center">
            {ticket.userThreadTs && ticket.userChannelId && (
              <a
                href={`https://hackclub.slack.com/archives/${ticket.userChannelId}/p${ticket.userThreadTs.replace('.', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 font-mono bg-amber-900/30 px-2 py-1 rounded-xl border-2 border-amber-700/50"
              >
                public
              </a>
            )}
            {ticket.staffThreadTs && ticket.staffChannelId && (
              <a
                href={`https://hackclub.slack.com/archives/${ticket.staffChannelId}/p${ticket.staffThreadTs.replace('.', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 font-mono bg-amber-900/30 px-2 py-1 rounded-xl border-2 border-amber-700/50"
              >
                staff
              </a>
            )}
            {ticket.status === 'open' && can(user?.role || '', PERMS.support_edit) && (
              <button
                onClick={closeTicket}
                className="text-red-400 font-mono bg-red-900/20 px-2 py-1 rounded-xl border-2 border-red-700/50"
              >
                close
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl flex flex-col shadow-2xl shadow-amber-950/30">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                {ticket.userAvatar ? (
                  <Image
                    src={ticket.userAvatar}
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full"
                    alt={ticket.userName}
                  />
                ) : (
                  <span className="text-amber-400 font-mono text-xs">{ticket.userName[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-200 font-mono text-xs font-bold">
                    {ticket.userName}
                  </span>
                  <span className="text-amber-300/60 font-mono text-xs">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-amber-200 font-mono text-xs">
                  <MsgRender text={ticket.question} users={ticket.userMap} />
                </div>
              </div>
            </div>

            {ticket.messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.pending ? 'opacity-50' : ''}`}>
                <div className="w-7 h-7 rounded-full bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  {msg.senderAvatar ? (
                    <Image
                      src={msg.senderAvatar}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full"
                      alt={msg.senderName}
                    />
                  ) : (
                    <span className="text-amber-300 font-mono text-xs">{msg.senderName[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1 flex-wrap">
                    <span className="text-amber-200 font-mono text-xs font-bold">
                      {msg.senderName}
                    </span>
                    {msg.isStaff && <span className="text-amber-400 font-mono text-xs">•</span>}
                    {msg.pending && (
                      <span className="text-yellow-400 font-mono text-xs">sending...</span>
                    )}
                    <span className="text-amber-300/60 font-mono text-xs">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-amber-200 font-mono text-xs">
                    <MsgRender text={msg.message} users={ticket.userMap} />
                  </div>
                  {msg.files && msg.files.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.files.map((file, idx) => {
                        const isImage = file.mimetype?.startsWith('image/')
                        const isSlack = file.url.includes('files.slack.com')
                        const fileUrl = isSlack
                          ? `/api/proxy-file?url=${encodeURIComponent(file.url)}`
                          : file.url

                        if (isImage) {
                          return (
                            <div
                              key={idx}
                              className="border-2 border-amber-700/50 rounded-xl overflow-hidden"
                              onClick={() => setLightbox(fileUrl)}
                            >
                              <Image
                                src={fileUrl}
                                alt={file.name}
                                width={120}
                                height={90}
                                className="w-24 h-18 object-cover"
                              />
                            </div>
                          )
                        }
                        return (
                          <a
                            key={idx}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-amber-900/30 border-2 border-amber-700/50 rounded-xl px-2 py-1 text-amber-400 text-xs truncate max-w-[100px]"
                          >
                            {file.name}
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={end} />
          </div>

          {can(user?.role || '', PERMS.support_edit) && (
            <div className="border-t-2 border-amber-900/40 p-2">
              {files.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {files.map((file, idx) => (
                    <div key={idx} className="relative">
                      <div className="w-10 h-10 rounded-xl border-2 border-amber-700/50 bg-amber-900/30 flex items-center justify-center text-xs">
                        {file.type.startsWith('image/') ? '🖼' : '📄'}
                      </div>
                      <button
                        onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="file"
                  multiple
                  ref={fileInput}
                  onChange={(e) => {
                    if (e.target.files) {
                      setFiles([...files, ...Array.from(e.target.files)])
                      e.target.value = ''
                    }
                  }}
                  className="hidden"
                  id="file-upload-m"
                />
                <label
                  htmlFor="file-upload-m"
                  className="bg-amber-900/40 text-amber-300 px-2 py-2 rounded-xl cursor-pointer font-mono text-sm border-2 border-amber-700/50"
                >
                  📎
                </label>
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      sendReply()
                    }
                  }}
                  placeholder="reply..."
                  className="flex-1 bg-black border-2 border-amber-900/40 rounded-xl px-2 py-2 text-amber-200 font-mono text-sm placeholder-amber-900/50"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || (!reply.trim() && files.length === 0)}
                  className="bg-gradient-to-br from-amber-900/50 to-amber-950/50 disabled:opacity-50 text-amber-200 px-3 py-2 font-mono text-sm rounded-xl border-2 border-amber-700 shadow-lg shadow-amber-950/30"
                >
                  ↑
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex h-full flex-col p-4">
        <Link
          href="/admin/tickets"
          className="text-amber-400 hover:text-amber-300 font-mono text-sm mb-3 inline-block"
        >
          ← back to tickets
        </Link>

        <div className="flex-1 flex gap-4 min-h-0">
          <div className="w-72 flex-shrink-0">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
              <h3 className="text-amber-400 font-mono text-sm mb-3">ticket info</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-amber-300/60 font-mono text-xs">id</div>
                  <div className="text-amber-200 font-mono text-sm">sw-{ticket.id}</div>
                </div>

                <div>
                  <div className="text-amber-300/60 font-mono text-xs mb-1">user</div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                      {ticket.userAvatar ? (
                        <Image
                          src={ticket.userAvatar}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full"
                          alt={ticket.userName}
                        />
                      ) : (
                        <span className="text-amber-400 font-mono text-sm">
                          {ticket.userName[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-amber-200 font-mono text-sm truncate">
                      {ticket.userName}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-amber-300/60 font-mono text-xs mb-1">question</div>
                  <div className="text-amber-200 font-mono text-xs leading-relaxed">
                    {ticket.question}
                  </div>
                </div>

                <div>
                  <div className="text-amber-300/60 font-mono text-xs">status</div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-xl border-2 font-mono text-xs mt-1 ${
                      ticket.status === 'open'
                        ? 'bg-green-900/30 text-green-400 border-green-700'
                        : 'bg-amber-900/30 text-amber-300/70 border-amber-700'
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>

                <div>
                  <div className="text-amber-300/60 font-mono text-xs">created</div>
                  <div className="text-amber-200 font-mono text-xs">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-amber-300/60 font-mono text-xs mb-1">assignees</div>
                  {can(user?.role || '', PERMS.support_edit) ? (
                    <div>
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {ticket.assignees && ticket.assignees.length > 0 ? (
                          ticket.assignees.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => removeAssignee(a.id)}
                              disabled={assigning}
                              className="text-amber-200 font-mono text-xs bg-amber-900/40 px-2.5 py-1.5 rounded-lg border-2 border-amber-700 flex items-center gap-1 hover:bg-amber-900/60 transition-all"
                            >
                              {a.username}
                              <span className="text-red-400 font-bold">×</span>
                            </button>
                          ))
                        ) : (
                          <span className="text-amber-300/60 font-mono text-xs">
                            no one assigned
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setShowDropdown(true)
                          }}
                          onFocus={() => setShowDropdown(true)}
                          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                          placeholder="type to add assignee..."
                          className="w-full bg-black border-2 border-amber-900/40 rounded-xl px-2.5 py-1.5 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-700"
                        />
                        {showDropdown && filteredStaff.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-black/95 border-2 border-amber-700 rounded-xl max-h-48 overflow-y-auto z-50 shadow-xl">
                            {filteredStaff.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => addAssignee(s.id)}
                                className="w-full text-left px-3 py-2 text-amber-200 font-mono text-xs hover:bg-amber-900/40 first:rounded-t-xl last:rounded-b-xl transition-all"
                              >
                                {s.username}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {ticket.assignees && ticket.assignees.length > 0 ? (
                        ticket.assignees.map((a) => (
                          <span
                            key={a.id}
                            className="text-amber-200 font-mono text-xs bg-amber-900/20 px-2 py-1 rounded border border-amber-700/30"
                          >
                            {a.username}
                          </span>
                        ))
                      ) : (
                        <span className="text-amber-300/60 font-mono text-xs">unassigned</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-col gap-2">
                    {ticket.userThreadTs && ticket.userChannelId && (
                      <a
                        href={`https://hackclub.slack.com/archives/${ticket.userChannelId}/p${ticket.userThreadTs.replace('.', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-900/30 text-blue-400 border-2 border-blue-700 px-3 py-1.5 rounded-xl font-mono text-xs hover:bg-blue-900/50 transition-all text-center"
                      >
                        public thread
                      </a>
                    )}
                    {ticket.staffThreadTs && ticket.staffChannelId && (
                      <a
                        href={`https://hackclub.slack.com/archives/${ticket.staffChannelId}/p${ticket.staffThreadTs.replace('.', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-purple-900/30 text-purple-400 border-2 border-purple-700 px-3 py-1.5 rounded-xl font-mono text-xs hover:bg-purple-900/50 transition-all text-center"
                      >
                        staff thread
                      </a>
                    )}
                  </div>
                </div>

                {ticket.status === 'open' && can(user?.role || '', PERMS.support_edit) && (
                  <button
                    onClick={closeTicket}
                    className="w-full bg-red-900/30 border-2 border-red-700 text-red-400 hover:bg-red-900/50 font-mono text-xs px-3 py-1.5 rounded-xl transition-all mt-2"
                  >
                    close ticket
                  </button>
                )}

                <div className="mt-4 pt-4 border-t-2 border-yellow-900/40">
                  <h4 className="text-yellow-400 font-mono text-xs mb-2">quick tips</h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div>
                      <span className="text-yellow-400 bg-yellow-900/30 px-1 rounded">?</span>
                      <span className="text-gray-400 ml-1">prefix = reply publicly</span>
                    </div>
                    <div>
                      <span className="text-gray-400">no prefix = staff thread</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl h-full flex flex-col shadow-2xl shadow-amber-950/30">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                    {ticket.userAvatar ? (
                      <Image
                        src={ticket.userAvatar}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full"
                        alt={ticket.userName}
                      />
                    ) : (
                      <span className="text-amber-400 font-mono text-sm">{ticket.userName[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-200 font-mono text-sm font-bold">
                        {ticket.userName}
                      </span>
                      <span className="text-amber-300/60 font-mono text-xs">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-amber-200 font-mono text-sm">
                      <MsgRender text={ticket.question} users={ticket.userMap} />
                    </div>
                  </div>
                </div>

                {ticket.messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.pending ? 'opacity-50' : ''}`}>
                    <div className="w-9 h-9 rounded-full bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                      {msg.senderAvatar ? (
                        <Image
                          src={msg.senderAvatar}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-full"
                          alt={msg.senderName}
                        />
                      ) : (
                        <span className="text-amber-300 font-mono text-sm">
                          {msg.senderName[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-amber-200 font-mono text-sm font-bold">
                          {msg.senderName}
                        </span>
                        {msg.isStaff && (
                          <span className="text-amber-400 font-mono text-xs">staff</span>
                        )}
                        {msg.pending && (
                          <span className="text-yellow-400 font-mono text-xs">sending...</span>
                        )}
                        <span className="text-amber-300/60 font-mono text-xs">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-amber-200 font-mono text-sm">
                        <MsgRender text={msg.message} users={ticket.userMap} />
                      </div>
                      {msg.files && msg.files.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.files.map((file, idx) => {
                            const isImage = file.mimetype?.startsWith('image/')
                            const isSlack = file.url.includes('files.slack.com')
                            const fileUrl = isSlack
                              ? `/api/proxy-file?url=${encodeURIComponent(file.url)}`
                              : file.url

                            if (isImage) {
                              return (
                                <div
                                  key={idx}
                                  className="border-2 border-amber-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500 transition-colors group"
                                  onClick={() => setLightbox(fileUrl)}
                                >
                                  <div className="relative">
                                    <Image
                                      src={fileUrl}
                                      alt={file.name}
                                      width={200}
                                      height={150}
                                      className="w-48 h-36 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="text-amber-200 text-sm">biggae view</span>
                                    </div>
                                  </div>
                                  <div className="bg-amber-900/30 px-2 py-1 text-xs text-amber-300/70 truncate max-w-[192px]">
                                    {file.name}
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <a
                                key={idx}
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-amber-900/30 border-2 border-amber-700/50 rounded-xl px-3 py-2 hover:border-amber-500 transition-colors"
                              >
                                <div>
                                  <div className="text-amber-400 text-sm max-w-[150px] truncate">
                                    {file.name}
                                  </div>
                                  <div className="text-amber-300/60 text-xs">
                                    {(file.size / 1024).toFixed(1)}KB
                                  </div>
                                </div>
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={end} />
              </div>

              {can(user?.role || '', PERMS.support_edit) && (
                <div className="border-t-2 border-amber-900/40 p-3">
                  {files.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {files.map((file, idx) => {
                        const isImg = file.type.startsWith('image/')
                        return (
                          <div key={idx} className="relative group">
                            {isImg ? (
                              <div className="w-16 h-16 rounded-xl border-2 border-amber-700/50 overflow-hidden">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl border-2 border-amber-700/50 bg-amber-900/30 flex flex-col items-center justify-center">
                                <span className="text-xl">📄</span>
                                <span className="text-[10px] text-amber-300/70 truncate max-w-[56px] px-1">
                                  {file.name.split('.').pop()}
                                </span>
                              </div>
                            )}
                            <button
                              onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      multiple
                      ref={fileInput}
                      onChange={(e) => {
                        if (e.target.files) {
                          setFiles([...files, ...Array.from(e.target.files)])
                          e.target.value = ''
                        }
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 px-3 py-2 rounded-xl cursor-pointer transition-colors font-mono text-sm border-2 border-amber-700/50"
                    >
                      📎
                    </label>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendReply()
                        }
                      }}
                      onPaste={(e) => {
                        const items = e.clipboardData?.items
                        if (!items) return

                        const pastedFiles: File[] = []
                        for (let i = 0; i < items.length; i++) {
                          if (items[i].type.startsWith('image/')) {
                            const file = items[i].getAsFile()
                            if (file) pastedFiles.push(file)
                          }
                        }

                        if (pastedFiles.length > 0) {
                          e.preventDefault()
                          setFiles([...files, ...pastedFiles])
                        }
                      }}
                      placeholder="type ur reply..."
                      className="flex-1 bg-black border-2 border-amber-900/40 rounded-xl px-3 py-2 text-amber-200 font-mono text-sm resize-none focus:outline-none focus:border-amber-700 placeholder-amber-900/50"
                      rows={2}
                    />
                    <button
                      onClick={sendReply}
                      disabled={sending || (!reply.trim() && files.length === 0)}
                      className="bg-gradient-to-br from-amber-900/50 to-amber-950/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-amber-200 px-4 py-2 font-mono text-sm rounded-xl border-2 border-amber-700 shadow-lg shadow-amber-950/30 transition-all"
                    >
                      send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-96 flex-shrink-0">
            {can(user?.role || '', PERMS.support_edit) && (
              <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl shadow-amber-950/30">
                <h3 className="text-amber-400 font-mono text-sm mb-3">internal notes</h3>
                <div className="space-y-2 mb-3 overflow-y-auto max-h-80 pr-1">
                  {ticket.notes && ticket.notes.length > 0 ? (
                    ticket.notes.map((n) => (
                      <div
                        key={n.id}
                        className="bg-black/50 border border-amber-900/30 rounded-xl p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {n.author.avatar && (
                            <Image
                              src={n.author.avatar}
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded-full"
                              alt={n.author.username}
                            />
                          )}
                          <span className="text-amber-300 font-mono text-xs">
                            {n.author.username}
                          </span>
                          <span className="text-gray-500 font-mono text-xs ml-auto">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-300 font-mono text-xs whitespace-pre-wrap">
                          {n.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 font-mono text-xs text-center py-4">
                      no notes yet
                    </div>
                  )}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault()
                      addNote()
                    }
                  }}
                  placeholder="add note (ctrl+enter)"
                  className="w-full bg-black border-2 border-amber-900/40 rounded-xl px-3 py-2 text-amber-200 font-mono text-sm focus:outline-none focus:border-amber-700 resize-none"
                  rows={3}
                />
                <button
                  onClick={addNote}
                  disabled={!note.trim() || addingNote}
                  className="w-full mt-2 bg-amber-900/30 border-2 border-amber-700 text-amber-300 hover:bg-amber-900/50 font-mono text-sm px-3 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingNote ? '...' : 'add note'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          <img
            src={lightbox}
            alt="fullscreen"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  )
}
