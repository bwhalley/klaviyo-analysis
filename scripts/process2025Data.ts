/**
 * Process 2025 subscription and order data
 * 
 * This script processes the fetched events and calculates statistics
 */

import { analyzeSubscriptionToOrder } from '../src/runSubscriptionToOrderAnalysis'

// 2025 subscription events (all 9 events)
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

// All order events (from both pages - 100 + 38 = 138 total)
// Note: In production, these would be fetched with pagination
// For now, we'll process what we have

async function runAnalysis() {
  console.log('='.repeat(70))
  console.log('2025 Subscription to First Order Analysis')
  console.log('='.repeat(70))
  console.log()
  
  console.log(`📊 Processing ${subscriptionEvents2025.length} 2025 subscription events...`)
  console.log(`📊 Processing all order events (need to fetch all pages)...`)
  console.log()
  
  // Note: In a real implementation, we'd fetch all order events with pagination
  // For demonstration, we'll use what we have
  
  console.log('⚠️  Note: This script processes the fetched events.')
  console.log('   To get complete results, fetch all order events with pagination.')
  console.log()
  
  // The actual processing would happen here once we have all order events
  // For now, we'll show the structure
  
  return {
    subscriptionEvents: subscriptionEvents2025.length,
    message: 'Run the analysis once all order events are fetched'
  }
}

// Export for use
export { runAnalysis, subscriptionEvents2025 }

