import { redis } from '@/lib/redis'
import { UserTier } from '@prisma/client'

interface RateLimitConfig {
  limit: number
  windowSeconds: number
}

const tierLimits: Record<UserTier, RateLimitConfig> = {
  FREE: {
    limit: parseInt(process.env.GENERATION_FREE_TIER_LIMIT || '1'),
    windowSeconds: parseInt(process.env.GENERATION_FREE_TIER_WINDOW || '86400'), // 24 hours
  },
  PRO: {
    limit: parseInt(process.env.GENERATION_PRO_TIER_LIMIT || '100'),
    windowSeconds: parseInt(process.env.GENERATION_PRO_TIER_WINDOW || '86400'), // 24 hours
  },
  ENTERPRISE: {
    limit: parseInt(process.env.GENERATION_ENTERPRISE_TIER_LIMIT || '1000'),
    windowSeconds: parseInt(process.env.GENERATION_ENTERPRISE_TIER_WINDOW || '86400'), // 24 hours
  },
}

export async function checkGenerationRateLimit(
  userId: string,
  tier: UserTier
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const config = tierLimits[tier]
  const key = `generation:rate-limit:${userId}`

  try {
    const current = await redis.incr(key)

    // Set expiry on first request
    if (current === 1) {
      await redis.expire(key, config.windowSeconds)
    }

    const ttl = await redis.ttl(key)
    const resetTime = new Date(Date.now() + (ttl > 0 ? ttl : config.windowSeconds) * 1000)

    return {
      allowed: current <= config.limit,
      remaining: Math.max(0, config.limit - current),
      resetTime,
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Fail open - allow request if we can't check rate limit
    return {
      allowed: true,
      remaining: config.limit,
      resetTime: new Date(Date.now() + config.windowSeconds * 1000),
    }
  }
}

export async function resetGenerationRateLimit(userId: string): Promise<void> {
  const key = `generation:rate-limit:${userId}`
  try {
    await redis.del(key)
  } catch (error) {
    console.error('Failed to reset rate limit:', error)
  }
}

export function getTierPriority(tier: UserTier): number {
  const priorities = {
    ENTERPRISE: 3,
    PRO: 2,
    FREE: 1,
  }
  return priorities[tier]
}
