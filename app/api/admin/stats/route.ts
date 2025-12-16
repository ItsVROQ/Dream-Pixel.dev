import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/adminMiddleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Total users
    const totalUsers = await prisma.user.count()

    // Active subscriptions
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        status: {
          in: ['ACTIVE', 'TRIALING']
        }
      }
    })

    // Total generations (24h, 7d, 30d)
    const [generations24h, generations7d, generations30d] = await Promise.all([
      prisma.generation.count({
        where: { createdAt: { gte: last24h } }
      }),
      prisma.generation.count({
        where: { createdAt: { gte: last7d } }
      }),
      prisma.generation.count({
        where: { createdAt: { gte: last30d } }
      })
    ])

    // Calculate MRR (Monthly Recurring Revenue)
    // Assuming PRO = $10/month, ENTERPRISE = $50/month
    const subscriptionsByTier = await prisma.user.groupBy({
      by: ['tier'],
      where: {
        subscription: {
          status: {
            in: ['ACTIVE', 'TRIALING']
          }
        }
      },
      _count: true
    })

    const tierPrices = {
      FREE: 0,
      PRO: 10,
      ENTERPRISE: 50
    }

    const mrr = subscriptionsByTier.reduce((total, item) => {
      return total + (tierPrices[item.tier as keyof typeof tierPrices] || 0) * item._count
    }, 0)

    // User signups over time (last 30 days)
    const signupsData = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM users
      WHERE created_at >= ${last30d}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Generations over time (last 30 days)
    const generationsData = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM generations
      WHERE created_at >= ${last30d}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Recent generations
    const recentGenerations = await prisma.generation.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            tier: true
          }
        }
      }
    })

    // Recent signups
    const recentSignups = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        createdAt: true,
        emailVerified: true
      }
    })

    // Recent subscriptions
    const recentSubscriptions = await prisma.subscription.findMany({
      take: 10,
      orderBy: { currentPeriodStart: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            tier: true
          }
        }
      }
    })

    return NextResponse.json({
      kpis: {
        totalUsers,
        activeSubscriptions,
        generations: {
          last24h: generations24h,
          last7d: generations7d,
          last30d: generations30d
        },
        mrr
      },
      charts: {
        signups: signupsData.map(item => ({
          date: item.date,
          count: Number(item.count)
        })),
        generations: generationsData.map(item => ({
          date: item.date,
          count: Number(item.count)
        }))
      },
      recentActivity: {
        generations: recentGenerations,
        signups: recentSignups,
        subscriptions: recentSubscriptions
      }
    })

  } catch (error) {
    console.error('Failed to fetch admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
