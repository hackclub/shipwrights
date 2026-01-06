import { NextResponse } from 'next/server'
import { PERMS } from '@/lib/perms'
import { getCerts, searchCerts } from '@/lib/certs'
import { api } from '@/lib/api'

export const GET = api(PERMS.certs_view)(async ({ req }) => {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    if (search) {
      const data = await searchCerts(search)
      return NextResponse.json(data)
    }

    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy') || 'newest'
    const lbMode = searchParams.get('lbMode') || 'weekly'

    const data = await getCerts({ type, status, sortBy, lbMode })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'shit hit the fan loading certifications' }, { status: 500 })
  }
})
