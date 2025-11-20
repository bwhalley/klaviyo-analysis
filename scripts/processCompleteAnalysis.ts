/**
 * Complete 2025 Subscription to First Order Analysis
 * 
 * This processes all fetched events and calculates final statistics
 */

// 2025 Subscribers
const SUBSCRIBERS_2025 = new Map<string, Date>([
  ["01JWG0Q3YE4AG7VJXGVSKKDC1K", new Date("2025-05-30T07:15:18+00:00")],
  ["01JXWGJF86JT3DKDPK2GQFQR71", new Date("2025-06-16T13:58:58+00:00")],
])

/**
 * Process order events and match to subscribers
 */
function processOrderEvents(orderEvents: any[]): Map<string, Date> {
  const orders = new Map<string, Date>()
  
  for (const event of orderEvents) {
    const profileID = event.relationships?.profile?.data?.id
    if (!profileID) continue
    
    const datetime = event.attributes?.datetime
    if (!datetime) continue
    
    const orderDate = new Date(datetime)
    
    // Keep only the earliest order per profile
    const existing = orders.get(profileID)
    if (!existing || orderDate < existing) {
      orders.set(profileID, orderDate)
    }
  }
  
  return orders
}

/**
 * Match subscribers to orders and calculate statistics
 */
function analyzeSubscribersToOrders(
  subscribers: Map<string, Date>,
  orders: Map<string, Date>
) {
  const results: Array<{
    profileID: string
    subscribedDate: Date
    firstOrderDate: Date | null
    daysToFirstOrder: number | null
  }> = []
  
  for (const [profileID, subscribedDate] of subscribers.entries()) {
    const orderDate = orders.get(profileID) || null
    
    let daysToFirstOrder: number | null = null
    if (orderDate && orderDate > subscribedDate) {
      const diffMs = orderDate.getTime() - subscribedDate.getTime()
      daysToFirstOrder = Math.round(diffMs / (1000 * 60 * 60 * 24))
    }
    
    results.push({
      profileID,
      subscribedDate,
      firstOrderDate: orderDate,
      daysToFirstOrder,
    })
  }
  
  return results
}

/**
 * Calculate statistics
 */
function calculateStatistics(results: Array<{
  profileID: string
  subscribedDate: Date
  firstOrderDate: Date | null
  daysToFirstOrder: number | null
}>) {
  const withOrders = results.filter(r => r.daysToFirstOrder !== null && r.daysToFirstOrder >= 0)
  const daysToOrder = withOrders
    .map(r => r.daysToFirstOrder!)
    .sort((a, b) => a - b)
  
  const mean = daysToOrder.length > 0
    ? daysToOrder.reduce((sum, d) => sum + d, 0) / daysToOrder.length
    : 0
  
  const median = daysToOrder.length > 0
    ? daysToOrder[Math.floor(daysToOrder.length / 2)]
    : 0
  
  // Standard deviation
  const variance = daysToOrder.length > 0
    ? daysToOrder.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / daysToOrder.length
    : 0
  const stdDev = Math.sqrt(variance)
  
  // Percentiles
  const p25 = daysToOrder.length > 0 ? daysToOrder[Math.floor(daysToOrder.length * 0.25)] : 0
  const p75 = daysToOrder.length > 0 ? daysToOrder[Math.floor(daysToOrder.length * 0.75)] : 0
  const p90 = daysToOrder.length > 0 ? daysToOrder[Math.floor(daysToOrder.length * 0.90)] : 0
  const p95 = daysToOrder.length > 0 ? daysToOrder[Math.floor(daysToOrder.length * 0.95)] : 0
  
  return {
    totalSubscribers: results.length,
    subscribersWithOrder: withOrders.length,
    conversionRate: results.length > 0 ? (withOrders.length / results.length) * 100 : 0,
    meanDaysToFirstOrder: mean,
    medianDaysToFirstOrder: median,
    stdDev,
    percentiles: { p25, p75, p90, p95 },
  }
}

/**
 * Main analysis function
 */
export function runCompleteAnalysis(orderEvents: any[]) {
  console.log('='.repeat(70))
  console.log('2025 Subscription to First Order - Complete Analysis')
  console.log('='.repeat(70))
  console.log()
  
  // Process order events
  console.log(`Processing ${orderEvents.length} order events...`)
  const orders = processOrderEvents(orderEvents)
  console.log(`Found ${orders.size} unique profiles with orders`)
  console.log()
  
  // Match subscribers to orders
  console.log('Matching 2025 subscribers to orders...')
  const results = analyzeSubscribersToOrders(SUBSCRIBERS_2025, orders)
  
  // Calculate statistics
  console.log('Calculating statistics...')
  const stats = calculateStatistics(results)
  
  // Display results
  console.log()
  console.log('='.repeat(70))
  console.log('📊 RESULTS')
  console.log('='.repeat(70))
  console.log()
  console.log(`Total 2025 Subscribers: ${stats.totalSubscribers}`)
  console.log(`Subscribers who placed an order: ${stats.subscribersWithOrder}`)
  console.log(`Conversion Rate: ${stats.conversionRate.toFixed(2)}%`)
  console.log()
  
  if (stats.subscribersWithOrder > 0) {
    console.log('Time to First Order:')
    console.log(`  Mean: ${stats.meanDaysToFirstOrder.toFixed(2)} days`)
    console.log(`  Median: ${stats.medianDaysToFirstOrder.toFixed(2)} days`)
    console.log(`  Standard Deviation: ${stats.stdDev.toFixed(2)} days`)
    console.log()
    console.log('Percentiles:')
    console.log(`  P25: ${stats.percentiles.p25} days`)
    console.log(`  P75: ${stats.percentiles.p75} days`)
    console.log(`  P90: ${stats.percentiles.p90} days`)
    console.log(`  P95: ${stats.percentiles.p95} days`)
  } else {
    console.log('No subscribers placed an order yet.')
  }
  
  console.log()
  console.log('Individual Results:')
  results.forEach(r => {
    console.log(`  ${r.profileID}:`)
    console.log(`    Subscribed: ${r.subscribedDate.toISOString().split('T')[0]}`)
    if (r.firstOrderDate) {
      console.log(`    First Order: ${r.firstOrderDate.toISOString().split('T')[0]}`)
      console.log(`    Days to Order: ${r.daysToFirstOrder}`)
    } else {
      console.log(`    No order placed yet`)
    }
  })
  
  console.log()
  console.log('='.repeat(70))
  
  return { results, statistics: stats }
}

export { SUBSCRIBERS_2025 }

