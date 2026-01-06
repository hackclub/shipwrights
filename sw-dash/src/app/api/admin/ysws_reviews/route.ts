import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { PERMS } from '@/lib/perms'
import { getYsws } from '@/lib/ysws'

export const GET = api(PERMS.ysws_view)(async ({ req }) => {
  const params = req.nextUrl.searchParams
  const status = params.get('status') || 'pending'
  const sortBy = params.get('sortBy') || 'newest'
  const lbMode = params.get('lbMode') || 'weekly'

  const data = await getYsws({ status, sortBy, lbMode })
  return NextResponse.json(data)
})
