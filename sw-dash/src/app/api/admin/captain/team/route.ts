import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { cache, genKey } from '@/lib/cache'
import { getTeamList } from '@/lib/captain'

const CACHE_TTL = 90

export const GET = api(PERMS.captain_dashboard)(async () => {
  const cacheKey = genKey('captain-team-list', {})
  const members = await cache(cacheKey, CACHE_TTL, getTeamList)

  const headers = new Headers()
  headers.set('Cache-Control', 'private, max-age=60')

  return NextResponse.json({ members }, { headers })
})
