'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AddUser } from '@/components/admin/add-user'

interface User {
  id: number
  username: string
  slackId: string
  isActive: boolean
  role: string
  createdAt: string
  avatar?: string | null
}

interface Props {
  users: User[]
  canEdit: boolean
  canAdd: boolean
  myName: string
  mySlackId: string
}

const roleColor = (r: string) => {
  switch (r) {
    case 'megawright':
      return 'text-purple-400 bg-purple-900/30 border-purple-700/50'
    case 'hq':
      return 'text-pink-400 bg-pink-900/30 border-pink-700/50'
    case 'captain':
      return 'text-blue-400 bg-blue-900/30 border-blue-700/50'
    case 'shipwright':
      return 'text-green-400 bg-green-900/30 border-green-700/50'
    case 'fraudster':
      return 'text-orange-400 bg-orange-900/30 border-orange-700/50'
    case 'syswright':
      return 'text-red-400 bg-red-900/30 border-red-700/50'
    default:
      return 'text-amber-300/60 bg-zinc-800 border-amber-900/30'
  }
}

export function UsersView({ users, canEdit, canAdd, myName, mySlackId }: Props) {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return users
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.id.toString().includes(q)
    )
  }, [users, search])

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-2 border-amber-900/40 rounded-2xl p-3 w-full md:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search name, role, id..."
            className="w-full bg-zinc-950/50 border-2 border-amber-900/30 text-amber-200 rounded-xl p-2 font-mono text-sm focus:outline-none focus:border-amber-700 transition-colors"
          />
          <div className="text-amber-300/40 font-mono text-xs mt-2">
            {filtered.length} / {users.length} shown
          </div>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-mono text-sm px-6 py-3 rounded-2xl transition-all border-2 border-amber-500/50 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-950/30"
          >
            + add user
          </button>
        )}
      </div>

      <AddUser
        open={showAdd}
        onClose={() => setShowAdd(false)}
        myName={myName}
        mySlackId={mySlackId}
      />

      {/* desktop */}
      <div className="hidden lg:block bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '13%' }} />
          </colgroup>
          <thead className="border-b-2 border-amber-900/40">
            <tr className="bg-zinc-900/50">
              <th className="text-left text-amber-400 font-mono text-sm px-4 py-3">ID</th>
              <th className="text-left text-amber-400 font-mono text-sm px-4 py-3">USER</th>
              <th className="text-left text-amber-400 font-mono text-sm px-4 py-3">SLACK</th>
              <th className="text-left text-amber-400 font-mono text-sm px-4 py-3">ROLE</th>
              <th className="text-left text-amber-400 font-mono text-sm px-4 py-3">STATUS</th>
              <th className="text-left text-amber-400 font-mono text-sm px-4 py-3">JOINED</th>
              <th className="text-left text-amber-400 font-mono text-sm px-4 py-3">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.id}
                className="border-b border-amber-900/20 hover:bg-amber-900/10 transition-colors"
              >
                <td className="text-amber-300/60 font-mono text-sm px-4 py-3">#{u.id}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.avatar && (
                      <Image
                        src={u.avatar}
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded"
                      />
                    )}
                    <span className="text-amber-200 font-mono text-sm truncate">{u.username}</span>
                  </div>
                </td>
                <td className="text-amber-300/50 font-mono text-xs px-4 py-3">{u.slackId}</td>
                <td className="px-4 py-3">
                  <span
                    className={`font-mono text-xs px-2 py-1 rounded-lg border ${roleColor(u.role)}`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`font-mono text-xs px-2 py-1 rounded-lg border ${u.isActive ? 'bg-green-900/30 text-green-400 border-green-700/50' : 'bg-red-900/30 text-red-400 border-red-700/50'}`}
                  >
                    {u.isActive ? 'active' : 'inactive'}
                  </span>
                </td>
                <td className="text-amber-300/50 font-mono text-sm px-4 py-3">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {canEdit ? (
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="px-4 py-1.5 bg-amber-900/50 hover:bg-amber-900/70 border-2 border-amber-700 text-amber-200 font-mono text-xs rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      manage
                    </Link>
                  ) : (
                    <span className="text-amber-300/40 font-mono text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && search && (
          <div className="text-center py-12 text-amber-300/50 font-mono text-sm">
            no matches for &quot;{search}&quot;
          </div>
        )}
        {users.length === 0 && (
          <div className="text-center py-12 text-amber-300/50 font-mono text-sm">no users yet</div>
        )}
      </div>

      {/* mobile */}
      <div className="lg:hidden space-y-4">
        {filtered.map((u) => (
          <Link
            key={u.id}
            href={canEdit ? `/admin/users/${u.id}` : '#'}
            className={`block bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-4 shadow-2xl ${canEdit ? 'active:scale-[0.98] transition-transform' : ''}`}
          >
            <div className="flex items-center gap-3 mb-3">
              {u.avatar && (
                <Image
                  src={u.avatar}
                  alt=""
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-amber-200 font-mono text-sm truncate">{u.username}</div>
                <div className="text-amber-300/50 font-mono text-xs">#{u.id}</div>
              </div>
              <span
                className={`font-mono text-xs px-2 py-1 rounded-lg border ${u.isActive ? 'bg-green-900/30 text-green-400 border-green-700/50' : 'bg-red-900/30 text-red-400 border-red-700/50'}`}
              >
                {u.isActive ? 'active' : 'inactive'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/50 border border-amber-900/30 rounded-xl p-2">
                <div className="text-amber-300/50 font-mono text-xs mb-1">role</div>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-lg border inline-block ${roleColor(u.role)}`}
                >
                  {u.role}
                </span>
              </div>
              <div className="bg-zinc-900/50 border border-amber-900/30 rounded-xl p-2">
                <div className="text-amber-300/50 font-mono text-xs mb-1">joined</div>
                <div className="text-amber-200 font-mono text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="mt-2 text-amber-300/40 font-mono text-xs truncate">{u.slackId}</div>
          </Link>
        ))}
        {filtered.length === 0 && search && (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 text-center text-amber-300/50 font-mono text-sm">
            no matches for &quot;{search}&quot;
          </div>
        )}
        {users.length === 0 && (
          <div className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-4 border-amber-900/40 rounded-3xl p-6 text-center text-amber-300/50 font-mono text-sm">
            no users yet
          </div>
        )}
      </div>
    </>
  )
}
