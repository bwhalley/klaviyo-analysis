/**
 * Quick analysis of 2025 subscriptions to first order
 * 
 * This processes the data we've fetched to show immediate results
 */

// Process subscription events to get unique profiles and their first subscription date
const subscriptions = new Map<string, Date>()

const subscriptionEvents = [
  {"id": "6dnBJkXXFaU", "datetime": "2025-05-30T07:15:18+00:00", "profileID": "01JWG0Q3YE4AG7VJXGVSKKDC1K"},
  {"id": "6dnBppS8mZ8", "datetime": "2025-05-30T07:15:19+00:00", "profileID": "01JWG0Q3YE4AG7VJXGVSKKDC1K"},
  {"id": "6dnCn2q683f", "datetime": "2025-05-30T07:15:20+00:00", "profileID": "01JWG0Q3YE4AG7VJXGVSKKDC1K"},
  {"id": "6dnBqxevLxk", "datetime": "2025-05-30T07:15:22+00:00", "profileID": "01JWG0Q3YE4AG7VJXGVSKKDC1K"},
  {"id": "6dnBqvLCdzZ", "datetime": "2025-05-30T07:15:28+00:00", "profileID": "01JWG0Q3YE4AG7VJXGVSKKDC1K"},
  {"id": "6dnBrDCik2p", "datetime": "2025-05-30T07:15:28+00:00", "profileID": "01JWG0Q3YE4AG7VJXGVSKKDC1K"},
  {"id": "6dnCkT3GmMj", "datetime": "2025-05-30T07:15:29+00:00", "profileID": "01JWG0Q3YE4AG7VJXGVSKKDC1K"},
  {"id": "6fU3GN9ZC2x", "datetime": "2025-06-16T13:58:58+00:00", "profileID": "01JXWGJF86JT3DKDPK2GQFQR71"},
]

for (const event of subscriptionEvents) {
  const profileID = event.profileID
  const date = new Date(event.datetime)
  const existing = subscriptions.get(profileID)
  if (!existing || date < existing) {
    subscriptions.set(profileID, date)
  }
}

console.log('='.repeat(70))
console.log('2025 Subscription to First Order Analysis')
console.log('='.repeat(70))
console.log()
console.log(`Total 2025 Subscribers (unique profiles): ${subscriptions.size}`)
console.log()
console.log('Subscription dates:')
for (const [profileID, date] of subscriptions.entries()) {
  console.log(`  ${profileID}: ${date.toISOString().split('T')[0]}`)
}

// Note: To complete the analysis, we need to:
// 1. Fetch all order events with pagination
// 2. Match each subscriber to their first order
// 3. Calculate time differences
// 4. Compute statistics

console.log()
console.log('📝 Next steps:')
console.log('  1. Fetch all order events with pagination')
console.log('  2. Match subscribers to their first order')
console.log('  3. Calculate statistics (mean, median, conversion rate)')
console.log('  4. Generate cohort data')

