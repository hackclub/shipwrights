import { NextResponse } from 'next/server'
import { can, PERMS } from '@/lib/perms'
import { getCerts } from '@/lib/certs'
import { api } from '@/lib/api'

export const GET = api(PERMS.certs_view)(async ({ req, user }) => {
  try {
    const { searchParams } = new URL(req.url)
    const returnedOnly = searchParams.get('returned') === '1'
    if (returnedOnly && !can(user.role, PERMS.captain_dashboard)) {
      return NextResponse.json({ error: 'Only captains can view returned-by-admin list' }, { status: 403 })
    }

    const rawType = searchParams.get('type')
    const type = rawType ? rawType.split(',').filter(Boolean) : null
    const ftType = searchParams.get('ftType')
    const status = searchParams.get('status') || (returnedOnly ? 'pending' : undefined)
    const sortBy = searchParams.get('sortBy') || 'newest'
    const lbMode = searchParams.get('lbMode') || 'weekly'
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const search = searchParams.get('search')

    const data = await getCerts({
      type,
      ftType,
      status: status || undefined,
      sortBy,
      lbMode,
      from,
      to,
      search,
      returnedOnly: returnedOnly || undefined,
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'shit hit the fan loading certifications' }, { status: 500 })
  }
})
