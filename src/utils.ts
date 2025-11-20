/**
 * Utilities for Klaviyo subscription to order analysis
 */

export const METRIC_IDS = {
  SUBSCRIBED_TO_LIST: 'UfyMVA',
  PLACED_ORDER: 'UhZHSf',
} as const

/**
 * Extract cursor from Klaviyo pagination URL
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
 * Fetch all events with pagination
 * 
 * @param getEvents - Function that fetches a page of events, optionally with a cursor
 * @param metricName - Name of the metric for logging purposes
 * @returns All events from all pages
 */
export async function fetchAllEvents(
  getEvents: (pageCursor?: string | null) => Promise<any>,
  metricName: string
): Promise<any[]> {
  const allEvents: any[] = []
  let pageCursor: string | null = null
  let pageCount = 0
  
  do {
    console.log(`Fetching ${metricName} events, page ${++pageCount}...`)
    const response = await getEvents(pageCursor || undefined)
    
    if (response.data) {
      allEvents.push(...response.data)
      console.log(`  ✓ Got ${response.data.length} events (total: ${allEvents.length})`)
    }
    
    pageCursor = extractCursor(response.links?.next || null)
    
    // Small delay to avoid rate limiting
    if (pageCursor) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  } while (pageCursor)
  
  console.log(`✅ Fetched ${allEvents.length} total ${metricName} events`)
  return allEvents
}

