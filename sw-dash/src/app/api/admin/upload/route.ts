import { NextResponse } from 'next/server'
import { api } from '@/lib/api'

export const POST = api()(async () => {
  return NextResponse.json({ ok: true })
})
