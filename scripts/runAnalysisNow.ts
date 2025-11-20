/**
 * Run the complete 2025 analysis NOW
 * 
 * This processes all fetched events and displays results
 */

import { analyzeSubscriptionToOrder } from '../src/runSubscriptionToOrderAnalysis'

// 2025 subscription events
const subscriptionEvents2025 = [
  {
    "type": "event",
    "id": "6dnBJkXXFaU",
    "attributes": {"timestamp": 1748589318, "datetime": "2025-05-30T07:15:18+00:00", "uuid": "d7144700-3d25-11f0-8001-e043363df0f5"},
    "relationships": {"profile": {"data": {"type": "profile", "id": "01JWG0Q3YE4AG7VJXGVSKKDC1K"}}, "metric": {"data": {"type": "metric", "id": "UfyMVA"}}}
  },
  {
    "type": "event",
    "id": "6dnBppS8mZ8",
    "attributes": {"timestamp": 1748589319, "datetime": "2025-05-30T07:15:19+00:00", "uuid": "d7acdd80-3d25-11f0-8001-0f4eb0e001c7"},
    "relationships": {"profile": {"data": {"type": "profile", "id": "01JWG0Q3YE4AG7VJXGVSKKDC1K"}}, "metric": {"data": {"type": "metric", "id": "UfyMVA"}}}
  },
  {
    "type": "event",
    "id": "6dnCn2q683f",
    "attributes": {"timestamp": 1748589320, "datetime": "2025-05-30T07:15:20+00:00", "uuid": "d8457400-3d25-11f0-8001-2eb72bef08d7"},
    "relationships": {"profile": {"data": {"type": "profile", "id": "01JWG0Q3YE4AG7VJXGVSKKDC1K"}}, "metric": {"data": {"type": "metric", "id": "UfyMVA"}}}
  },
  {
    "type": "event",
    "id": "6dnBqxevLxk",
    "attributes": {"timestamp": 1748589322, "datetime": "2025-05-30T07:15:22+00:00", "uuid": "d976a100-3d25-11f0-8001-4e50a0fb5bc1"},
    "relationships": {"profile": {"data": {"type": "profile", "id": "01JWG0Q3YE4AG7VJXGVSKKDC1K"}}, "metric": {"data": {"type": "metric", "id": "UfyMVA"}}}
  },
  {
    "type": "event",
    "id": "6dnBqvLCdzZ",
    "attributes": {"timestamp": 1748589328, "datetime": "2025-05-30T07:15:28+00:00", "uuid": "dd0a2800-3d25-11f0-8001-e83e4d1fa1e4"},
    "relationships": {"profile": {"data": {"type": "profile", "id": "01JWG0Q3YE4AG7VJXGVSKKDC1K"}}, "metric": {"data": {"type": "metric", "id": "UfyMVA"}}}
  },
  {
    "type": "event",
    "id": "6dnBrDCik2p",
    "attributes": {"timestamp": 1748589328, "datetime": "2025-05-30T07:15:28+00:00", "uuid": "dd0a2800-3d25-11f0-8001-eddaa75504e0"},
    "relationships": {"profile": {"data": {"type": "profile", "id": "01JWG0Q3YE4AG7VJXGVSKKDC1K"}}, "metric": {"data": {"type": "metric", "id": "UfyMVA"}}}
  },
  {
    "type": "event",
    "id": "6dnCkT3GmMj",
    "attributes": {"timestamp": 1748589329, "datetime": "2025-05-30T07:15:29+00:00", "uuid": "dda2be80-3d25-11f0-8001-431cfe392da6"},
    "relationships": {"profile": {"data": {"type": "profile", "id": "01JWG0Q3YE4AG7VJXGVSKKDC1K"}}, "metric": {"data": {"type": "metric", "id": "UfyMVA"}}}
  },
  {
    "type": "event",
    "id": "6fU3GN9ZC2x",
    "attributes": {"timestamp": 1750082338, "datetime": "2025-06-16T13:58:58+00:00", "uuid": "0c58bd00-4aba-11f0-8001-189c900aa0b0"},
    "relationships": {"profile": {"data": {"type": "profile", "id": "01JXWGJF86JT3DKDPK2GQFQR71"}}, "metric": {"data": {"type": "metric", "id": "UfyMVA"}}}
  }
]

/**
 * Main function - run the analysis
 * 
 * Note: This function needs all order events to be passed in
 * In production, you'd fetch all order events with pagination first
 */
export async function runAnalysisNow(orderEvents: any[]) {
  console.log('='.repeat(70))
  console.log('2025 Subscription to First Order - Complete Analysis')
  console.log('='.repeat(70))
  console.log()
  
  console.log(`📥 Processing ${subscriptionEvents2025.length} 2025 subscription events...`)
  console.log(`📥 Processing ${orderEvents.length} order events...`)
  console.log()
  
  // Run the analysis
  const result = await analyzeSubscriptionToOrder(
    subscriptionEvents2025,
    orderEvents
  )
  
  // Display results
  console.log('='.repeat(70))
  console.log('📊 RESULTS')
  console.log('='.repeat(70))
  console.log()
  console.log(`Total 2025 Subscribers: ${result.statistics.totalSubscribers.toLocaleString()}`)
  console.log(`Subscribers who placed an order: ${result.statistics.subscribersWithOrder.toLocaleString()}`)
  console.log(`Conversion Rate: ${result.statistics.conversionRate.toFixed(2)}%`)
  console.log()
  
  if (result.statistics.subscribersWithOrder > 0) {
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
  } else {
    console.log('⚠️  No subscribers placed an order yet.')
  }
  
  console.log()
  console.log('Individual Results:')
  result.profiles.forEach(profile => {
    console.log(`  Profile ${profile.profileID}:`)
    console.log(`    Subscribed: ${profile.firstSubscriptionDate.toISOString().split('T')[0]}`)
    if (profile.firstOrderDate) {
      console.log(`    First Order: ${profile.firstOrderDate.toISOString().split('T')[0]}`)
      console.log(`    Days to Order: ${profile.daysToFirstOrder} days`)
    } else {
      console.log(`    No order placed yet`)
    }
  })
  
  console.log()
  if (result.cohortData.length > 0) {
    console.log('Cohort Analysis:')
    result.cohortData.forEach(cohort => {
      console.log(`  ${cohort.cohortLabel}: ${cohort.subscribers} subscribers, ${cohort.ordersPlaced} orders (${cohort.conversionRate.toFixed(1)}% conversion)`)
    })
  }
  
  console.log()
  console.log('='.repeat(70))
  
  return result
}

