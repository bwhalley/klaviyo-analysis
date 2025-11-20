/**
 * Analyze 2025 subscriptions to first order
 * 
 * This script:
 * 1. Fetches all subscription events from 2025 with pagination
 * 2. Fetches all order events with pagination
 * 3. Matches 2025 subscribers to their first order
 * 4. Calculates statistics: how many bought, how long it took
 */

import { analyzeSubscriptionToOrder } from '../src/runSubscriptionToOrderAnalysis'

const SUBSCRIBED_METRIC_ID = 'UfyMVA'
const PLACED_ORDER_METRIC_ID = 'UhZHSf'

/**
 * Extract page cursor from Klaviyo pagination URL
 */
function extractCursor(nextUrl: string | null): string | null {
  if (!nextUrl) return null
  
  // The URL contains: page%5Bcursor%5D=...
  // Where %5B = [ and %5D = ]
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
 * Fetch all subscription events from 2025 with pagination
 */
async function fetchAll2025Subscriptions(): Promise<any[]> {
  const allEvents: any[] = []
  let pageCursor: string | null = null
  let pageCount = 0
  
  // Filter for 2025: January 1, 2025 to December 31, 2025
  const startDate = '2025-01-01T00:00:00+00:00'
  const endDate = '2025-12-31T23:59:59+00:00'
  
  console.log('Fetching 2025 subscription events...')
  
  do {
    pageCount++
    console.log(`  Fetching page ${pageCount}...`)
    
    // Build filters for 2025 subscriptions
    const filters = [
      { field: 'metric_id', operator: 'equals', value: SUBSCRIBED_METRIC_ID },
      { field: 'datetime', operator: 'greater-or-equal', value: startDate },
      { field: 'datetime', operator: 'less-or-equal', value: endDate },
    ]
    
    // Note: In a real implementation, you would call the MCP function here
    // For now, this is the structure needed
    const response = await fetchSubscriptionEvents(filters, pageCursor)
    
    if (response.data) {
      allEvents.push(...response.data)
      console.log(`    Got ${response.data.length} events (total: ${allEvents.length})`)
    }
    
    pageCursor = extractCursor(response.links?.next || null)
    
    // Small delay to avoid rate limiting
    if (pageCursor) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  } while (pageCursor)
  
  console.log(`✅ Fetched ${allEvents.length} total 2025 subscription events`)
  return allEvents
}

/**
 * Fetch all order events with pagination
 * We need all orders to match against 2025 subscribers
 */
async function fetchAllOrders(): Promise<any[]> {
  const allEvents: any[] = []
  let pageCursor: string | null = null
  let pageCount = 0
  
  console.log('Fetching all order events...')
  
  do {
    pageCount++
    console.log(`  Fetching page ${pageCount}...`)
    
    const filters = [
      { field: 'metric_id', operator: 'equals', value: PLACED_ORDER_METRIC_ID },
    ]
    
    const response = await fetchOrderEvents(filters, pageCursor)
    
    if (response.data) {
      allEvents.push(...response.data)
      console.log(`    Got ${response.data.length} events (total: ${allEvents.length})`)
    }
    
    pageCursor = extractCursor(response.links?.next || null)
    
    // Small delay to avoid rate limiting
    if (pageCursor) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  } while (pageCursor)
  
  console.log(`✅ Fetched ${allEvents.length} total order events`)
  return allEvents
}

/**
 * Wrapper function to call Klaviyo MCP get_events for subscriptions
 * This would be replaced with actual MCP function calls
 */
async function fetchSubscriptionEvents(
  filters: any[],
  pageCursor?: string | null
): Promise<any> {
  // This is a placeholder - in reality you'd call:
  // return await mcp_klaviyo_klaviyo_get_events({
  //   model: 'claude',
  //   events_fields: ['timestamp', 'datetime', 'uuid'],
  //   filters,
  //   sort: 'datetime',
  //   page_cursor: pageCursor || undefined
  // })
  
  throw new Error('This function needs to be implemented with actual MCP calls')
}

/**
 * Wrapper function to call Klaviyo MCP get_events for orders
 * This would be replaced with actual MCP function calls
 */
async function fetchOrderEvents(
  filters: any[],
  pageCursor?: string | null
): Promise<any> {
  // This is a placeholder - in reality you'd call:
  // return await mcp_klaviyo_klaviyo_get_events({
  //   model: 'claude',
  //   events_fields: ['timestamp', 'datetime', 'uuid'],
  //   filters,
  //   sort: 'datetime',
  //   page_cursor: pageCursor || undefined
  // })
  
  throw new Error('This function needs to be implemented with actual MCP calls')
}

/**
 * Main analysis function
 */
export async function analyze2025Subscriptions(): Promise<{
  statistics: {
    total2025Subscribers: number
    subscribersWithOrder: number
    conversionRate: number
    meanDaysToFirstOrder: number
    medianDaysToFirstOrder: number
    stdDev: number
    percentiles: {
      p25: number
      p75: number
      p90: number
      p95: number
    }
  }
  cohortData: any[]
  profiles: any[]
}> {
  console.log('='.repeat(60))
  console.log('Analyzing 2025 Subscriptions to First Order')
  console.log('='.repeat(60))
  
  // Step 1: Fetch all 2025 subscription events
  const subscriptionEvents = await fetchAll2025Subscriptions()
  
  // Step 2: Fetch all order events
  const orderEvents = await fetchAllOrders()
  
  // Step 3: Process and analyze
  console.log('\nProcessing data...')
  const result = await analyzeSubscriptionToOrder(subscriptionEvents, orderEvents)
  
  // Step 4: Display results
  console.log('\n' + '='.repeat(60))
  console.log('RESULTS')
  console.log('='.repeat(60))
  console.log(`\nTotal 2025 Subscribers: ${result.statistics.totalSubscribers}`)
  console.log(`Subscribers who placed an order: ${result.statistics.subscribersWithOrder}`)
  console.log(`Conversion Rate: ${result.statistics.conversionRate.toFixed(2)}%`)
  console.log(`\nTime to First Order:`)
  console.log(`  Mean: ${result.statistics.meanDaysToFirstOrder.toFixed(2)} days`)
  console.log(`  Median: ${result.statistics.medianDaysToFirstOrder.toFixed(2)} days`)
  console.log(`  Std Dev: ${result.statistics.stdDev.toFixed(2)} days`)
  console.log(`\nPercentiles:`)
  console.log(`  P25: ${result.statistics.percentiles.p25} days`)
  console.log(`  P75: ${result.statistics.percentiles.p75} days`)
  console.log(`  P90: ${result.statistics.percentiles.p90} days`)
  console.log(`  P95: ${result.statistics.percentiles.p95} days`)
  
  return {
    statistics: {
      total2025Subscribers: result.statistics.totalSubscribers,
      subscribersWithOrder: result.statistics.subscribersWithOrder,
      conversionRate: result.statistics.conversionRate,
      meanDaysToFirstOrder: result.statistics.meanDaysToFirstOrder,
      medianDaysToFirstOrder: result.statistics.medianDaysToFirstOrder,
      stdDev: result.statistics.stdDev,
      percentiles: result.statistics.percentiles,
    },
    cohortData: result.cohortData,
    profiles: result.profiles,
  }
}

// Example usage:
// const result = await analyze2025Subscriptions();
// console.log(JSON.stringify(result, null, 2));

