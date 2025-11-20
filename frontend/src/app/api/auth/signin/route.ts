/**
 * Custom signin endpoint with rate limiting
 * Note: Most auth is handled by NextAuth, but we add rate limiting here
 */

import { NextRequest, NextResponse } from 'next/server'
import { loginRateLimiter, getRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Get identifier for rate limiting (IP address)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  // Check rate limit
  const rateLimitResult = await loginRateLimiter.check(`login:${ip}`)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many login attempts',
        message: `Please try again in ${rateLimitResult.retryAfter} seconds`,
      },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    )
  }
  
  // Rate limit passed - forward to NextAuth
  // The actual authentication is handled by NextAuth's callback
  return NextResponse.json(
    { message: 'Rate limit check passed' },
    {
      status: 200,
      headers: getRateLimitHeaders(rateLimitResult),
    }
  )
}

