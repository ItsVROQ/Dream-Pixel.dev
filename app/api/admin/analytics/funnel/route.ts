import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/adminMiddleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    // Conversion funnel: Signups → Verified → Generated → Subscribed
    const [
      totalSignups,
      verifiedUsers,
      usersWithGenerations,
      subscribedUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          emailVerified: { not: null }
        }
      }),
      prisma.user.count({
        where: {
          generations: {
            some: {}
          }
        }
      }),
      prisma.user.count({
        where: {
          subscription: {
            status: {
              in: ['ACTIVE', 'TRIALING']
            }
          }
        }
      })
    ])

    const funnel = [
      {
        step: 'Signups',
        count: totalSignups,
        percentage: 100
      },
      {
        step: 'Verified',
        count: verifiedUsers,
        percentage: totalSignups > 0 ? ((verifiedUsers / totalSignups) * 100).toFixed(2) : 0
      },
      {
        step: 'Generated',
        count: usersWithGenerations,
        percentage: totalSignups > 0 ? ((usersWithGenerations / totalSignups) * 100).toFixed(2) : 0
      },
      {
        step: 'Subscribed',
        count: subscribedUsers,
        percentage: totalSignups > 0 ? ((subscribedUsers / totalSignups) * 100).toFixed(2) : 0
      }
    ]

    return NextResponse.json({ funnel })

  } catch (error) {
    console.error('Failed to fetch funnel data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    )
  }
}
