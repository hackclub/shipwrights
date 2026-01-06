'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

type User = {
  id: number
  username: string
  slackId: string
  avatar: string | null
  role: string
  isActive: boolean
}

type UserCtx = {
  user: User | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const UserContext = createContext<UserCtx | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/me')
      if (!res.ok) {
        if (res.status === 401) {
          setUser(null)
          setError(null)
          return
        }
        throw new Error('failed to get user')
      }
      const data = await res.json()
      setUser(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'shit broke')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return (
    <UserContext.Provider value={{ user, loading, error, refetch: fetchUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error('useUser must be used inside UserProvider')
  }
  return ctx
}
