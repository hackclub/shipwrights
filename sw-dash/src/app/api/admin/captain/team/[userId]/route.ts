import { NextResponse } from 'next/server'
import { withParams } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { parseId, idErr } from '@/lib/utils'
import { cache, genKey } from '@/lib/cache'
import { getMemberActivity } from '@/lib/captain'

const CACHE_TTL = 90

export const GET = withParams<{ userId: string }>(PERMS.captain_dashboard)(async ({ params }) => {
  const userId = parseId(params.userId, 'user')
  if (!userId) return idErr('user')

  const cacheKey = genKey('captain-team-member', { userId: String(userId) })
  const data = await cache(cacheKey, CACHE_TTL, () => getMemberActivity(userId))

  if (!data) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  const headers = new Headers()
  headers.set('Cache-Control', 'private, max-age=60')

  return NextResponse.json(data, { headers })
})
