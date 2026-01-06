'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserProvider, useUser } from '@/lib/user-context'

function AuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading, refetch } = useUser()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    const onFocus = () => refetch()
    window.addEventListener('focus', onFocus)

    const interval = setInterval(refetch, 5 * 60 * 1000)

    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [refetch])

  if (loading) {
    return null
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AuthCheck>{children}</AuthCheck>
    </UserProvider>
  )
}
