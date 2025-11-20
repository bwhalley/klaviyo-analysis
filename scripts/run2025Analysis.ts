/**
 * Run 2025 subscription to first order analysis
 * 
 * This script:
 * 1. Fetches all 2025 subscription events with pagination
 * 2. Fetches all order events with pagination
 * 3. Matches subscribers to their first order
 * 4. Calculates statistics
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
 * Note: This function needs to call the MCP function directly
 */
export async function fetchAll2025Subscriptions(): Promise<any[]> {
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
    
    // Call MCP function - this needs to be done through the MCP interface
    // For now, this is a placeholder showing the structure
    const filters = [
      { field: 'metric_id', operator: 'equals', value: SUBSCRIBED_METRIC_ID },
      { field: 'datetime', operator: 'greater-or-equal', value: startDate },
      { field: 'datetime', operator: 'less-or-equal', value: endDate },
    ]
    
    // In a real implementation, you would call:
    // const response = await mcp_klaviyo_klaviyo_get_events({
    //   model: 'claude',
    //   events_fields: ['timestamp', 'datetime', 'uuid'],
    //   filters,
    //   sort: 'datetime',
    //   page_cursor: pageCursor || undefined
    // })
    
    // Placeholder - replace with actual MCP call
    const response: any = { data: [], links: { next: null } }
    
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
 * Note: This function needs to call the MCP function directly
 */
export async function fetchAllOrders(): Promise<any[]> {
  const allEvents: any[] = []
  let pageCursor: string | null = null
  let pageCount = 0
  
  console.log('📥 Fetching all order events...')
  
  do {
    pageCount++
    console.log(`  Page ${pageCount}...`)
    
    const filters = [
      { field: 'metric_id', operator: 'equals', value: PLACED_ORDER_METRIC_ID },
    ]
    
    // Call MCP function - this needs to be done through the MCP interface
    // In a real implementation, you would call:
    // const response = await mcp_klaviyo_klaviyo_get_events({
    //   model: 'claude',
    //   events_fields: ['timestamp', 'datetime', 'uuid'],
    //   filters,
    //   sort: 'datetime',
    //   page_cursor: pageCursor || undefined
    // })
    
    // Placeholder - replace with actual MCP call
    const response: any = { data: [], links: { next: null } }
    
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
 * Main analysis function
 */
export async function run2025Analysis(
  subscriptionEvents: any[],
  orderEvents: any[]
): Promise<void> {
  console.log('='.repeat(70))
  console.log('2025 Subscription to First Order Analysis')
  console.log('='.repeat(70))
  console.log()
  
  try {
    // Process and analyze
    console.log('🔍 Processing data...')
    const result = await analyzeSubscriptionToOrder(subscriptionEvents, orderEvents)
    
    // Display results
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
      result.cohortData.slice(0, 10).forEach(cohort => {
        console.log(`  ${cohort.cohortLabel}: ${cohort.subscribers} subscribers, ${cohort.ordersPlaced} orders (${cohort.conversionRate.toFixed(1)}% conversion, avg ${cohort.avgDaysToOrder.toFixed(1)} days)`)
      })
    }
    
    console.log()
    console.log('='.repeat(70))
    
    return result as any
  } catch (error) {
    console.error('❌ Error during analysis:', error)
    throw error
  }
}

