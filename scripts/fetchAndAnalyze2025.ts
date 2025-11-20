/**
 * Fetch and analyze 2025 subscriptions to first order
 * 
 * This script uses Klaviyo MCP functions to:
 * 1. Fetch all 2025 subscription events (with pagination)
 * 2. Fetch all order events (with pagination)
 * 3. Match subscribers to orders
 * 4. Calculate statistics
 */

import { analyzeSubscriptionToOrder } from '../src/runSubscriptionToOrderAnalysis'

const SUBSCRIBED_METRIC_ID = 'UfyMVA'
const PLACED_ORDER_METRIC_ID = 'UhZHSf'

/**
 * Extract cursor from Klaviyo pagination URL
 */
function extractCursor(nextUrl: string | null): string | null {
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
 * Fetch all 2025 subscription events with pagination
 */
async function fetchAll2025Subscriptions(): Promise<any[]> {
  const allEvents: any[] = []
  let pageCursor: string | null = null
  let pageCount = 0
  
  // Filter for 2025: January 1, 2025 to December 31, 2025
  const startDate = '2025-01-01T00:00:00+00:00'
  const endDate = '2025-12-31T23:59:59+00:00'
  
  console.log('📥 Fetching 2025 subscription events...')
  
  do {
    pageCount++
    console.log(`  Page ${pageCount}...`)
    
    // Note: This would need to be called through the MCP interface
    // For now, showing the structure needed
    const response = await fetchSubscriptionPage(startDate, endDate, pageCursor)
    
    if (response.data) {
      allEvents.push(...response.data)
      console.log(`    ✓ Got ${response.data.length} events (total: ${allEvents.length})`)
    }
    
    pageCursor = extractCursor(response.links?.next || null)
    
    // Small delay to avoid rate limiting
    if (pageCursor) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  } while (pageCursor)
  
  console.log(`✅ Fetched ${allEvents.length} total 2025 subscription events\n`)
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
  
  console.log('📥 Fetching all order events...')
  
  do {
    pageCount++
    console.log(`  Page ${pageCount}...`)
    
    const response = await fetchOrderPage(pageCursor)
    
    if (response.data) {
      allEvents.push(...response.data)
      console.log(`    ✓ Got ${response.data.length} events (total: ${allEvents.length})`)
    }
    
    pageCursor = extractCursor(response.links?.next || null)
    
    // Small delay to avoid rate limiting
    if (pageCursor) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  } while (pageCursor)
  
  console.log(`✅ Fetched ${allEvents.length} total order events\n`)
  return allEvents
}

/**
 * Fetch a single page of subscription events
 * This function should call the MCP function directly
 */
async function fetchSubscriptionPage(
  startDate: string,
  endDate: string,
  pageCursor?: string | null
): Promise<any> {
  // This is where you would call the MCP function
  // The actual implementation would be:
  
  const filters = [
    { field: 'metric_id', operator: 'equals', value: SUBSCRIBED_METRIC_ID },
    { field: 'datetime', operator: 'greater-or-equal', value: startDate },
    { field: 'datetime', operator: 'less-or-equal', value: endDate },
  ]
  
  // Call MCP function - this needs to be done through the MCP interface
  // return await mcp_klaviyo_klaviyo_get_events({
  //   model: 'claude',
  //   events_fields: ['timestamp', 'datetime', 'uuid'],
  //   filters,
  //   sort: 'datetime',
  //   page_cursor: pageCursor || undefined
  // })
  
  // For now, return a placeholder
  return { data: [], links: { next: null } }
}

/**
 * Fetch a single page of order events
 * This function should call the MCP function directly
 */
async function fetchOrderPage(pageCursor?: string | null): Promise<any> {
  // This is where you would call the MCP function
  // The actual implementation would be:
  
  const filters = [
    { field: 'metric_id', operator: 'equals', value: PLACED_ORDER_METRIC_ID },
  ]
  
  // Call MCP function - this needs to be done through the MCP interface
  // return await mcp_klaviyo_klaviyo_get_events({
  //   model: 'claude',
  //   events_fields: ['timestamp', 'datetime', 'uuid'],
  //   filters,
  //   sort: 'datetime',
  //   page_cursor: pageCursor || undefined
  // })
  
  // For now, return a placeholder
  return { data: [], links: { next: null } }
}

/**
 * Main analysis function
 */
export async function run2025Analysis(): Promise<void> {
  console.log('='.repeat(70))
  console.log('2025 Subscription to First Order Analysis')
  console.log('='.repeat(70))
  console.log()
  
  try {
    // Step 1: Fetch all 2025 subscription events
    const subscriptionEvents = await fetchAll2025Subscriptions()
    
    // Step 2: Fetch all order events
    const orderEvents = await fetchAllOrders()
    
    // Step 3: Process and analyze
    console.log('🔍 Processing data...')
    const result = await analyzeSubscriptionToOrder(subscriptionEvents, orderEvents)
    
    // Step 4: Display results
    console.log('\n' + '='.repeat(70))
    console.log('📊 RESULTS')
    console.log('='.repeat(70))
    console.log()
    console.log(`Total 2025 Subscribers: ${result.statistics.totalSubscribers.toLocaleString()}`)
    console.log(`Subscribers who placed an order: ${result.statistics.subscribersWithOrder.toLocaleString()}`)
    console.log(`Conversion Rate: ${result.statistics.conversionRate.toFixed(2)}%`)
    console.log()
    console.log('Time to First Order:')
    console.log(`  Mean: ${result.statistics.meanDaysToFirstOrder.toFixed(2)} days`)
    console.log(`  Median: ${result.statistics.medianDaysToFirstOrder.toFixed(2)} days`)
    console.log(`  Standard Deviation: ${result.statistics.stdDev.toFixed(2)} days`)
    console.log()
    console.log('Percentiles:')
    console.log(`  P25: ${result.statistics.percentiles.p25} days`)
    console.log(`  P75: ${result.statistics.percentiles.p75} days`)
    console.log(`  P90: ${result.statistics.percentiles.p90} days`)
    console.log(`  P95: ${result.statistics.percentiles.p95} days`)
    console.log()
    
    // Show cohort data summary
    if (result.cohortData.length > 0) {
      console.log(`Cohort Analysis: ${result.cohortData.length} cohorts`)
      console.log('First few cohorts:')
      result.cohortData.slice(0, 5).forEach(cohort => {
        console.log(`  ${cohort.cohortLabel}: ${cohort.subscribers} subscribers, ${cohort.ordersPlaced} orders (${cohort.conversionRate.toFixed(1)}% conversion)`)
      })
    }
    
    console.log()
    console.log('='.repeat(70))
    
  } catch (error) {
    console.error('❌ Error during analysis:', error)
    throw error
  }
}

// Export for use in other scripts
export { fetchAll2025Subscriptions, fetchAllOrders }

