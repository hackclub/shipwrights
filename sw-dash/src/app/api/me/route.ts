import { NextRequest, NextResponse } from 'next/server'
import { needAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { user, error } = await needAuth(req)

  if (error) {
    return NextResponse.json(error, { status: error.status })
  }

  return NextResponse.json({
    id: user!.id,
    username: user!.username,
    slackId: user!.slackId,
    avatar: user!.avatar,
    role: user!.role,
    isActive: user!.isActive,
  })
}
