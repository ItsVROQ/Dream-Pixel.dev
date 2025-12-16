import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/adminMiddleware'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/auth/rateLimit'

export async function GET(request: NextRequest) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const logLevel = searchParams.get('logLevel') || ''
    const logLimit = parseInt(searchParams.get('logLimit') || '100')

    // Check database connection
    let dbStatus = 'healthy'
    let dbLatency = 0
    try {
      const start = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbLatency = Date.now() - start
    } catch (error) {
      dbStatus = 'unhealthy'
    }

    // Check Redis connection
    let redisStatus = 'healthy'
    let redisLatency = 0
    try {
      const start = Date.now()
      await redis.ping()
      redisLatency = Date.now() - start
    } catch (error) {
      redisStatus = 'unhealthy'
    }

    // Get error logs
    const errorLogWhere: Record<string, unknown> = {}
    if (logLevel) {
      errorLogWhere.level = logLevel
    }

    const errorLogs = await prisma.errorLog.findMany({
      where: errorLogWhere,
      take: logLimit,
      orderBy: { createdAt: 'desc' }
    })

    // Error rate calculation (last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const errorCount = await prisma.errorLog.count({
      where: {
        level: 'ERROR',
        createdAt: { gte: last24h }
      }
    })

    const totalRequests = await prisma.generation.count({
      where: {
        createdAt: { gte: last24h }
      }
    })

    const errorRate = totalRequests > 0 
      ? ((errorCount / totalRequests) * 100).toFixed(2)
      : 0

    // Storage stats (would need S3 integration in production)
    const totalGenerations = await prisma.generation.count({
      where: { status: 'SUCCEEDED' }
    })

    // API uptime approximation
    const apiUptime = dbStatus === 'healthy' && redisStatus === 'healthy' ? 100 : 0

    return NextResponse.json({
      database: {
        status: dbStatus,
        latency: dbLatency
      },
      redis: {
        status: redisStatus,
        latency: redisLatency
      },
      api: {
        uptime: apiUptime,
        errorRate,
        totalRequests24h: totalRequests,
        errors24h: errorCount
      },
      storage: {
        totalImages: totalGenerations,
        // In production, would include S3 bucket size and costs
        estimatedSize: `${(totalGenerations * 2).toFixed(2)} MB`
      },
      errorLogs
    })

  } catch (error) {
    console.error('Failed to fetch system health:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system health' },
      { status: 500 }
    )
  }
}
