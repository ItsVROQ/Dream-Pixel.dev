import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: {
    database: { status: 'up' | 'down'; responseTime: number }
    redis: { status: 'up' | 'down'; responseTime: number }
    api: { status: 'up' | 'down'; responseTime: number }
  }
  version: string
  environment: string
}

export async function GET(): Promise<NextResponse<HealthCheckResult>> {
  const startTime = Date.now()
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks: {
      database: { status: 'down', responseTime: 0 },
      redis: { status: 'down', responseTime: 0 },
      api: { status: 'up', responseTime: 0 },
    },
    version: '0.1.0',
    environment: process.env.APP_ENV || process.env.NODE_ENV || 'unknown',
  }

  try {
    // Check database connection
    const dbStartTime = Date.now()
    try {
      await prisma.$queryRaw`SELECT 1`
      result.checks.database = {
        status: 'up',
        responseTime: Date.now() - dbStartTime,
      }
    } catch (error) {
      result.checks.database = {
        status: 'down',
        responseTime: Date.now() - dbStartTime,
      }
      result.status = 'degraded'
      logger.warn('Database health check failed', { error: String(error) })
      Sentry.captureException(error)
    }

    // Check Redis connection (if configured)
    const redisStartTime = Date.now()
    if (process.env.UPSTASH_REDIS_REST_URL) {
      try {
        const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
        })
        if (response.ok) {
          result.checks.redis = {
            status: 'up',
            responseTime: Date.now() - redisStartTime,
          }
        } else {
          result.checks.redis = {
            status: 'down',
            responseTime: Date.now() - redisStartTime,
          }
          result.status = 'degraded'
        }
      } catch (error) {
        result.checks.redis = {
          status: 'down',
          responseTime: Date.now() - redisStartTime,
        }
        result.status = 'degraded'
        logger.warn('Redis health check failed', { error: String(error) })
      }
    }

    result.checks.api.responseTime = Date.now() - startTime

    logger.info('Health check completed', {
      status: result.status,
      responseTime: result.checks.api.responseTime,
    })

    const statusCode = result.status === 'healthy' ? 200 : 503
    return NextResponse.json(result, { status: statusCode })
  } catch (error) {
    result.status = 'unhealthy'
    result.checks.api.responseTime = Date.now() - startTime
    logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)))
    Sentry.captureException(error)
    return NextResponse.json(result, { status: 503 })
  }
export async function GET() {
  return NextResponse.json({ ok: true })
}
