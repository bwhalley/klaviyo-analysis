/**
 * Rate Limiting Utility
 * Implements in-memory and Redis-based rate limiting
 */

import { Redis } from 'ioredis'
import { redis } from './redis'
import { getConfig } from './env'

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Rate limiter using Redis (or in-memory fallback)
 */
export class RateLimiter {
  private memoryStore: Map<string, { count: number; resetAt: number }> = new Map()
  
  constructor(
    private windowMs: number,
    private maxRequests: number
  ) {}
  
  /**
   * Check if request should be rate limited
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now()
    const key = `ratelimit:${identifier}`
    
    try {
      // Try Redis first
      if (redis) {
        return await this.checkRedis(key, now)
      }
    } catch (error) {
      console.error('Redis rate limit error, falling back to memory:', error)
    }
    
    // Fallback to in-memory
    return this.checkMemory(key, now)
  }
  
  /**
   * Redis-based rate limiting
   */
  private async checkRedis(key: string, now: number): Promise<RateLimitResult> {
    const windowStart = now - this.windowMs
    
    // Remove old entries
    await redis!.zremrangebyscore(key, 0, windowStart)
    
    // Count current requests
    const count = await redis!.zcard(key)
    
    if (count >= this.maxRequests) {
      // Get oldest timestamp to calculate retry after
      const oldest = await redis!.zrange(key, 0, 0, 'WITHSCORES')
      const retryAfter = oldest[1] ? parseInt(oldest[1]) + this.windowMs - now : this.windowMs
      
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: Math.ceil((now + this.windowMs) / 1000),
        retryAfter: Math.ceil(retryAfter / 1000),
      }
    }
    
    // Add current request
    await redis!.zadd(key, now, `${now}-${Math.random()}`)
    await redis!.expire(key, Math.ceil(this.windowMs / 1000))
    
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - count - 1,
      reset: Math.ceil((now + this.windowMs) / 1000),
    }
  }
  
  /**
   * In-memory rate limiting (fallback)
   */
  private checkMemory(key: string, now: number): RateLimitResult {
    const record = this.memoryStore.get(key)
    
    // Clean up expired records
    if (record && record.resetAt < now) {
      this.memoryStore.delete(key)
    }
    
    const current = this.memoryStore.get(key)
    
    if (!current) {
      // First request in window
      this.memoryStore.set(key, { count: 1, resetAt: now + this.windowMs })
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: Math.ceil((now + this.windowMs) / 1000),
      }
    }
    
    if (current.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: Math.ceil(current.resetAt / 1000),
        retryAfter: Math.ceil((current.resetAt - now) / 1000),
      }
    }
    
    // Increment counter
    current.count++
    
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - current.count,
      reset: Math.ceil(current.resetAt / 1000),
    }
  }
  
  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `ratelimit:${identifier}`
    
    if (redis) {
      await redis.del(key)
    }
    
    this.memoryStore.delete(key)
  }
}

// Pre-configured rate limiters
const config = getConfig()

export const loginRateLimiter = new RateLimiter(
  config.LOGIN_RATE_LIMIT_WINDOW_MS,
  config.LOGIN_RATE_LIMIT_MAX_ATTEMPTS
)

export const apiRateLimiter = new RateLimiter(
  config.RATE_LIMIT_WINDOW_MS,
  config.RATE_LIMIT_MAX_REQUESTS
)

/**
 * Helper to create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  }
  
  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter)
  }
  
  return headers
}

