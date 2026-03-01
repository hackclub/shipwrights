import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'

export const GET = api(PERMS.support_view)(async () => {
  const botUrl = process.env.NEXT_PUBLIC_BOT_URL || 'http://localhost:45100'
  try {
    const resp = await fetch(`${botUrl}/macros`)
    if (!resp.ok) return NextResponse.json({})
    return NextResponse.json(await resp.json())
  } catch {
    return NextResponse.json({})
  }
})
