import { NextResponse } from 'next/server'
import { PERMS, can } from '@/lib/perms'
import { prisma } from '@/lib/db'
import { parseId, idErr } from '@/lib/utils'
import { syslog } from '@/lib/syslog'
import { bust } from '@/lib/cache'
import { withParams } from '@/lib/api'

const CLAIM_TIMEOUT = 30 * 60 * 1000

export const GET = withParams(PERMS.certs_edit)(async ({ user, params }) => {
  try {
    const shipId = parseId(params.id, 'ship ID')

    if (!shipId) {
      return idErr('ship ID')
    }

    const cert = await prisma.shipCert.findUnique({
      where: { id: shipId },
      include: {
        claimer: {
          select: {
            username: true,
          },
        },
      },
    })

    if (!cert) {
      return NextResponse.json({ error: 'ship doesnt exist' }, { status: 404 })
    }

    if (cert.status !== 'pending') {
      return NextResponse.json({
        claimedBy: null,
        canEdit: true,
      })
    }

    const now = new Date()
    const thirtyMinsAgo = new Date(now.getTime() - CLAIM_TIMEOUT)

    if (cert.reviewStartedAt && cert.claimerId) {
      if (cert.reviewStartedAt > thirtyMinsAgo) {
        return NextResponse.json(
          {
            claimedBy: cert.claimer?.username || 'someone',
            claimedAt: cert.reviewStartedAt.toISOString(),
            canEdit: cert.claimerId === user.id || user.role === 'megawright',
          },
          { status: cert.claimerId === user.id || user.role === 'megawright' ? 200 : 423 }
        )
      }
    }

    return NextResponse.json({
      claimedBy: null,
      canEdit: true,
    })
  } catch {
    return NextResponse.json({ error: 'check claim shit broke' }, { status: 500 })
  }
})

export const POST = withParams(PERMS.certs_edit)(async ({ user, params, ip, ua }) => {
  try {
    const shipId = parseId(params.id, 'ship ID')

    if (!shipId) {
      return idErr('ship ID')
    }

    const now = new Date()
    const thirtyMinsAgo = new Date(now.getTime() - CLAIM_TIMEOUT)

    const existingClaim = await prisma.shipCert.findFirst({
      where: {
        claimerId: user.id,
        status: 'pending',
        reviewStartedAt: {
          gt: thirtyMinsAgo,
        },
        id: {
          not: shipId,
        },
      },
    })

    if (existingClaim) {
      return NextResponse.json(
        { error: 'u already got a claim bro, finish that first' },
        { status: 400 }
      )
    }

    const cert = await prisma.shipCert.findUnique({
      where: { id: shipId },
      include: {
        claimer: {
          select: {
            username: true,
          },
        },
      },
    })

    if (!cert) {
      return NextResponse.json({ error: 'ship doesnt exist' }, { status: 404 })
    }

    if (cert.status !== 'pending') {
      return NextResponse.json({
        claimedBy: null,
        canEdit: true,
      })
    }

    if (cert.reviewStartedAt && cert.claimerId) {
      if (cert.reviewStartedAt > thirtyMinsAgo) {
        if (cert.claimerId === user.id) {
          return NextResponse.json({
            claimedBy: user.username,
            claimedAt: cert.reviewStartedAt.toISOString(),
            canEdit: true,
          })
        }

        return NextResponse.json(
          {
            claimedBy: cert.claimer?.username || 'someone',
            canEdit: user.role === 'megawright',
            error: "u can't claim this rn",
          },
          { status: user.role === 'megawright' ? 200 : 423 }
        )
      }
    }

    await prisma.shipCert.update({
      where: { id: shipId },
      data: {
        reviewStartedAt: now,
        claimerId: user.id,
      },
    })

    await syslog(
      'ship_cert_claimed',
      200,
      user,
      `claimed ${cert.projectName}`,
      { ip, userAgent: ua },
      {
        targetId: shipId,
        targetType: 'ship_cert',
        metadata: {
          projectName: cert.projectName,
          ftProjectId: cert.ftProjectId,
          ftSlackId: cert.ftSlackId,
          previousClaimer: cert.claimerId,
        },
      }
    )

    await bust('cache:certs:*')

    return NextResponse.json({
      claimedBy: user.username,
      claimedAt: now.toISOString(),
      canEdit: true,
    })
  } catch {
    return NextResponse.json({ error: 'claim shit broke' }, { status: 500 })
  }
})

export const DELETE = withParams(PERMS.certs_edit)(async ({ user, params }) => {
  try {
    const shipId = parseId(params.id, 'ship ID')

    if (!shipId) {
      return idErr('ship ID')
    }

    const cert = await prisma.shipCert.findUnique({
      where: { id: shipId },
    })

    if (!cert) {
      return NextResponse.json({ error: 'ship doesnt exist' }, { status: 404 })
    }

    if (cert.claimerId !== user.id && !can(user.role, PERMS.certs_override)) {
      return NextResponse.json({ error: 'not ur claim' }, { status: 403 })
    }

    await prisma.shipCert.update({
      where: { id: shipId },
      data: {
        reviewStartedAt: null,
        claimerId: null,
      },
    })

    await bust('cache:certs:*')

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'unclaim broke' }, { status: 500 })
  }
})
