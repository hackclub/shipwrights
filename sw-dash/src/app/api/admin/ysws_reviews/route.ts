import { NextResponse } from 'next/server'
import { yswsApi } from '@/lib/api'
import { getYsws } from '@/lib/ysws'

export const GET = yswsApi(async (req) => {
  const params = req.nextUrl.searchParams
  const status = params.get('status') || null
  const sortBy = params.get('sortBy') || 'newest'
  const lbMode = params.get('lbMode') || 'weekly'
  const hours = params.get('hours') ? parseInt(params.get('hours')!) : null

  const data = await getYsws({ status, sortBy, lbMode, hours })
  return NextResponse.json(data)
})
