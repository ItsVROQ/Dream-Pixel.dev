import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/adminMiddleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    // Most used seeds
    const mostUsedSeeds = await prisma.seed.findMany({
      orderBy: { useCount: 'desc' },
      take: 10,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Trending seeds (most used in last 7 days)
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const trendingSeeds = await prisma.$queryRaw<Array<{
      seed_number: number
      usage_count: bigint
    }>>`
      SELECT seed as seed_number, COUNT(*)::int as usage_count
      FROM generations
      WHERE created_at >= ${last7d} AND seed IS NOT NULL
      GROUP BY seed
      ORDER BY usage_count DESC
      LIMIT 10
    `

    // Get full seed details for trending seeds
    const trendingSeedNumbers = trendingSeeds.map(s => s.seed_number)
    const trendingSeedDetails = await prisma.seed.findMany({
      where: {
        seedNumber: { in: trendingSeedNumbers }
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    const trendingSeedsWithUsage = trendingSeedDetails.map(seed => ({
      ...seed,
      recentUsage: Number(trendingSeeds.find(t => t.seed_number === seed.seedNumber)?.usage_count || 0)
    }))

    // Seeds awaiting approval
    const pendingApproval = await prisma.seed.count({
      where: { isApproved: false, isBanned: false }
    })

    // Banned seeds
    const bannedCount = await prisma.seed.count({
      where: { isBanned: true }
    })

    return NextResponse.json({
      mostUsed: mostUsedSeeds,
      trending: trendingSeedsWithUsage,
      stats: {
        pendingApproval,
        bannedCount
      }
    })

  } catch (error) {
    console.error('Failed to fetch seed analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seed analytics' },
      { status: 500 }
    )
  }
}
