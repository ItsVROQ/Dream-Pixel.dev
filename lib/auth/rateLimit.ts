import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: RATE_LIMIT_WINDOW_MS, maxRequests: RATE_LIMIT_MAX_REQUESTS }
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const key = `rate_limit:${identifier}`
  const now = Date.now()
  const window = Math.floor(now / config.windowMs)
  const windowKey = `${key}:${window}`
  
  try {
    const requests = await redis.incr(windowKey)
    
    if (requests === 1) {
      await redis.expire(windowKey, Math.ceil(config.windowMs / 1000))
    }
    
    const remaining = Math.max(0, config.maxRequests - requests)
    const resetTime = (window + 1) * config.windowMs
    
    return {
      success: requests <= config.maxRequests,
      remaining,
      resetTime
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return {
      success: true,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs
    }
  }
}

export async function incrementFailedLogin(userId: string): Promise<number> {
  const key = `failed_login:${userId}`
  const attempts = await redis.incr(key)
  
  if (attempts === 1) {
    await redis.expire(key, 900) // 15 minutes
  }
  
  return attempts
}

export async function resetFailedLogin(userId: string): Promise<void> {
  const key = `failed_login:${userId}`
  await redis.del(key)
}

export async function isAccountLocked(userId: string): Promise<{ locked: boolean; until?: number }> {
  const key = `account_lock:${userId}`
  const lockoutTime = await redis.get(key)
  
  if (lockoutTime) {
    const until = parseInt(lockoutTime as string)
    if (Date.now() < until) {
      return { locked: true, until }
    } else {
      // Lockout period has expired, clean up
      await redis.del(key)
    }
  }
  
  return { locked: false }
}

export async function lockAccount(userId: string, durationMs: number = 15 * 60 * 1000): Promise<void> {
  const key = `account_lock:${userId}`
  const lockoutUntil = Date.now() + durationMs
  await redis.setex(key, Math.ceil(durationMs / 1000), lockoutUntil.toString())
}