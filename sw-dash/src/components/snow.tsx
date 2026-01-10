'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Snowfall from 'react-snowfall'

export function Snow() {
  const [on, setOn] = useState(true)
  const path = usePathname()

  useEffect(() => {
    try {
      const saved = localStorage.getItem('snow')
      if (saved !== null) setOn(saved === 'true')
    } catch {}
  }, [])

  if (!on || path === '/') return null

  return (
    <Snowfall
      style={{
        position: 'fixed',
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      snowflakeCount={150}
      speed={[0.5, 2]}
      wind={[-0.5, 1]}
      radius={[0.5, 2.5]}
    />
  )
}
