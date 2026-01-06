'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'

export interface Msg {
  id: number
  senderId: string
  senderName: string
  senderAvatar?: string
  message: string
  files?: Array<{ name: string; url: string; mimetype: string; size: number }>
  isStaff: boolean
  createdAt: string
  pending?: boolean
}

export interface Note {
  id: string
  text: string
  createdAt: string
  author: {
    username: string
    avatar?: string
  }
}

export interface Ticket {
  id: number
  userId: string
  userName: string
  userAvatar?: string
  question: string
  status: string
  createdAt: string
  assignees?: Array<{ id: number; username: string; avatar?: string }>
  userThreadTs?: string
  staffThreadTs?: string
  userChannelId?: string
  staffChannelId?: string
  messages: Msg[]
  userMap?: { [key: string]: string }

  staff?: Array<{ id: number; username: string; avatar?: string }>
  notes?: Note[]
}

export interface CurrentUser {
  role?: string
  username?: string
  avatar?: string
  slackId?: string
}

export function useTicket(ticketId: string) {
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [botOk, setBotOk] = useState(true)

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/tickets/${ticketId}`)
    if (!r.ok) {
      router.push('/admin/tickets')
      return
    }
    const d = await r.json()

    setTicket((prev) => {
      if (!prev) return d
      const seen = new Set(d.messages.map((m: Msg) => m.id))
      const pending = prev.messages.filter((m) => m.pending && !seen.has(m.id))
      return { ...d, messages: [...d.messages, ...pending] }
    })
  }, [ticketId, router])

  useEffect(() => {
    load()

    const loadUser = async () => {
      try {
        const res = await fetch('/api/admin')
        if (res.ok) {
          const data = await res.json()
          setUser(data.currentUser)
        }
      } catch (e) {
        console.error('user fetch failed:', e)
      }
    }
    loadUser()

    const botUrl = process.env.NEXT_PUBLIC_BOT_URL || 'http://localhost:45100'

    let reconAttempts = 0
    const maxRecon = 5

    const checkHealth = async () => {
      try {
        const r = await fetch(`${botUrl}/health`, { method: 'GET' })
        setBotOk(r.ok)
      } catch {
        setBotOk(false)
      }
    }

    checkHealth()
    const healthInt = setInterval(checkHealth, 10000)

    const socket = io(botUrl, {
      path: '/ws/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: maxRecon,
    })

    socket.on('connect', () => {
      setBotOk(true)
      reconAttempts = 0
      socket.emit('join_ticket', { ticketId })
    })

    socket.on('new_message', (data) => {
      if (data.ticketId === parseInt(ticketId.replace('sw-', ''))) {
        load()
      }
    })

    socket.on('disconnect', () => {
      setBotOk(false)
    })

    socket.on('connect_error', () => {
      setBotOk(false)
      reconAttempts++
      if (reconAttempts >= maxRecon) {
        socket.close()
      }
    })

    return () => {
      clearInterval(healthInt)
      socket.disconnect()
    }
  }, [ticketId, load])

  return { ticket, setTicket, user, botOk, load }
}
