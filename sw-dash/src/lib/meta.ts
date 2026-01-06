import { NextRequest } from 'next/server'

export function getMeta(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    ua: req.headers.get('user-agent') || 'unknown',
  }
}
