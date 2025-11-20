/**
 * Quick analysis of the current batch of Klaviyo events
 * 
 * This shows the analysis of the first page of results we fetched.
 * Note: Full analysis would require paginating through all events.
 */

// From the API calls we just made:
// Subscription events: 100 events (first page)
// Order events: 100 events (first page)

// Key findings:
// - Subscription metric ID: UfyMVA ("Subscribed to List")
// - Order metric ID: UhZHSf ("Placed Order")
// - Both responses have pagination (links.next)

/**
 * Next steps to complete the analysis:
 * 
 * 1. Paginate through all subscription events:
 *    - Use the links.next from the first call
 *    - Continue fetching until links.next is null
 *    - Collect all subscription events
 * 
 * 2. Paginate through all order events:
 *    - Use the links.next from the first call
 *    - Continue fetching until links.next is null
 *    - Collect all order events
 * 
 * 3. Process the data:
 *    - Use runSubscriptionToOrderAnalysis.ts to process all events
 *    - Calculate statistics
 *    - Generate cohort data
 * 
 * 4. Visualize:
 *    - Create cohort chart showing signup dates vs conversion
 *    - Show distribution of days to first order
 */

export const METRIC_IDS = {
  SUBSCRIBED_TO_LIST: 'UfyMVA',
  PLACED_ORDER: 'UhZHSf',
}

/**
 * Example pagination function
 */
export async function fetchAllEvents(
  getEvents: (pageCursor?: string) => Promise<any>,
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
    }
    
    pageCursor = response.links?.next || null
    
    if (pageCursor) {
      // Extract cursor from URL
      const match = pageCursor.match(/page%5Bcursor%5D=([^&]+)/)
      if (match) {
        pageCursor = decodeURIComponent(match[1])
      }
    }
  } while (pageCursor)
  
  console.log(`Fetched ${allEvents.length} total ${metricName} events`)
  return allEvents
}

