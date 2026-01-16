'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { NO_ACCESS_URL } from '@/lib/perms'

export interface User {
  id: string
  username: string
  slackId: string
  isActive: boolean
  role?: string
  avatar?: string
  skills?: string[]
}

export interface Cert {
  id: number
  description: string
  status: string
  createdAt: string
  updatedAt: string
  repoUrl?: string
  demoUrl?: string
  projectName?: string
  shipCertId?: number
  author: User
  assignedReviewer: User | null
  assignee?: User | null
  assigneeId?: string
  shipCert?: {
    id: number
    projectName?: string
    projectType?: string
    description?: string
    demoUrl?: string
    repoUrl?: string
    readmeUrl?: string
    devTime?: string
    status?: string
    ftUsername?: string
  }
}

export interface Note {
  id: string
  message: string
  createdAt: string
  author: {
    id: string
    username: string
    avatar: string | null
    role: string
  }
}

export function useAssignment(id: string) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [cert, setCert] = useState<Cert | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [subbed, setSubbed] = useState(false)
  const [gif, setGif] = useState('')

  const checkSub = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/assignments/${id}/subscription`)
      if (res.ok) {
        const data = await res.json()
        setSubbed(data.isSubscribed)
      }
    } catch (e) {
      console.error('sub check failed:', e)
    }
  }, [id])

  useEffect(() => {
    const randomNum = Math.floor(Math.random() * 30) + 1
    setGif(`/motivation/${randomNum}.gif`)
  }, [])

  useEffect(() => {
    if (!id) return

    Promise.all([fetch(`/api/admin/assignments/${id}`), fetch('/api/admin')])
      .then(([certRes, userRes]) => {
        if (certRes.status === 401 || userRes.status === 401) {
          window.location.href = `${process.env.NEXT_PUBLIC_URL}/`
          return
        }
        if (certRes.status === 403) {
          window.location.href = `${process.env.NEXT_PUBLIC_URL}/${NO_ACCESS_URL}`
          return
        }
        if (certRes.status === 404) {
          setError('cert not found')
          setLoading(false)
          return
        }
        return Promise.all([certRes.json(), userRes.json()])
      })
      .then((results) => {
        if (results && results.length === 2) {
          const [certData, userData] = results
          if (certData && userData) {
            if (certData.error) {
              setError(certData.error)
            } else {
              setCert(certData.assignment)
              setUser(userData.currentUser)

              fetch(`/api/admin/assignments/${id}/notes`)
                .then((res) => res.json())
                .then((data) => {
                  if (data.notes) setNotes(data.notes)
                })
                .catch((e) => console.error('notes fetch failed:', e))

              fetch('/api/admin/users')
                .then((res) => res.json())
                .then((data) => {
                  if (data.users) setUsers(data.users)
                })
                .catch((e) => console.error('users fetch failed:', e))

              checkSub()
            }
            setLoading(false)
          }
        }
      })
      .catch(() => {
        setError('shit broke loading cert')
        setLoading(false)
      })

    fetch('/api/admin/users/mentions')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users)
      })
      .catch((e) => console.error('mentions fetch failed:', e))
  }, [id, router, checkSub])

  return {
    loading,
    cert,
    setCert,
    user,
    error,
    setError,
    notes,
    setNotes,
    users,
    setUsers,
    subbed,
    setSubbed,
    gif,
  }
}
