import Redis from 'ioredis'

// Create Redis client only if REDIS_URL is available
// During build time, this will be null
const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })
  : null

if (redis) {
  redis.on('error', (error) => {
    console.error('Redis Client Error:', error)
  })

  redis.on('connect', () => {
    console.log('Redis Client Connected')
  })
}

export default redis

