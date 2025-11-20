import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Format percentage
 */
export function formatPercentage(num: number, decimals: number = 1): string {
  return `${num.toFixed(decimals)}%`
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0
  return (part / total) * 100
}

/**
 * Truncate text
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extract cursor from pagination URL
 */
export function extractCursor(nextUrl: string | null): string | null {
  if (!nextUrl) return null

  // Extract from URL like: ...&page%5Bcursor%5D=WzE2NzU0NDIwOTQsIC...
  const match = nextUrl.match(/page%5Bcursor%5D=([^&]+)/)
  if (match) {
    return decodeURIComponent(match[1])
  }

  // Try alternative format
  const match2 = nextUrl.match(/page\[cursor\]=([^&]+)/)
  if (match2) {
    return decodeURIComponent(match2[1])
  }

  return null
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number
    delay?: number
    backoff?: number
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 2 } = options

  try {
    return await fn()
  } catch (error) {
    if (retries <= 0) throw error

    await sleep(delay)
    return retry(fn, {
      retries: retries - 1,
      delay: delay * backoff,
      backoff,
    })
  }
}

