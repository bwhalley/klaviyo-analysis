/**
 * Cache Service - Redis-based caching layer
 */

import redis from '@/lib/redis'

export class CacheService {
  /**
   * Get cached value or fetch and cache
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300 // Default 5 minutes
  ): Promise<T> {
    // If Redis is not available, just fetch the data
    if (!redis) {
      return fetchFn()
    }

    try {
      // Try to get from cache
      const cached = await redis.get(key)

      if (cached) {
        console.log(`✅ Cache hit: ${key}`)
        return JSON.parse(cached) as T
      }

      console.log(`❌ Cache miss: ${key}`)

      // Fetch fresh data
      const data = await fetchFn()

      // Cache the result
      await redis.setex(key, ttl, JSON.stringify(data))

      return data
    } catch (error) {
      console.error('Cache error:', error)
      // If cache fails, still return the data
      return fetchFn()
    }
  }

  /**
   * Set cache value
   */
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    if (!redis) return
    
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  /**
   * Delete cache value
   */
  async del(key: string): Promise<void> {
    if (!redis) return
    
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  /**
   * Delete all keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!redis) return
    
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error)
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    if (!redis) return false
    
    try {
      const exists = await redis.exists(key)
      return exists === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    if (!redis) return -1
    
    try {
      return await redis.ttl(key)
    } catch (error) {
      console.error('Cache TTL error:', error)
      return -1
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService()

