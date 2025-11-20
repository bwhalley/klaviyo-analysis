# Klaviyo Subscription to First Order Analysis - Summary

## Metrics Identified

✅ **"Subscribed to List"** metric:
- Metric ID: `UfyMVA`
- First page: 100 events returned
- Pagination: Available (has `links.next`)

✅ **"Placed Order"** metric:
- Metric ID: `UhZHSf`  
- First page: 100 events returned
- Pagination: Available (has `links.next`)

## Data Structure

Both event types follow the same structure:
```typescript
{
  data: [{
    id: string,
    attributes: {
      timestamp: number,
      datetime: string,  // ISO 8601 format
      uuid: string
    },
    relationships: {
      profile: {
        data: {
          id: string,  // Profile ID
          type: "profile"
        }
      },
      metric: {
        data: {
          id: string,  // Metric ID
          type: "metric"
        }
      }
    }
  }],
  links: {
    next: string | null  // Pagination cursor
  }
}
```

## Key Fields for Analysis

- **Profile ID**: `relationships.profile.data.id`
- **Event Date**: `attributes.datetime` (ISO 8601 format)
- **Event Timestamp**: `attributes.timestamp` (Unix timestamp)

## Next Steps

### 1. Paginate Through All Events

Both metrics have pagination. You'll need to:

```typescript
// Fetch all subscription events
const subscriptionEvents = await fetchAllEvents(
  (cursor) => mcp_klaviyo_klaviyo_get_events({
    model: "claude",
    events_fields: ["timestamp", "datetime", "uuid"],
    filters: [{ field: "metric_id", operator: "equals", value: "UfyMVA" }],
    sort: "datetime",
    page_cursor: cursor
  }),
  "Subscription"
)

// Fetch all order events
const orderEvents = await fetchAllEvents(
  (cursor) => mcp_klaviyo_klaviyo_get_events({
    model: "claude",
    events_fields: ["timestamp", "datetime", "uuid"],
    filters: [{ field: "metric_id", operator: "equals", value: "UhZHSf" }],
    sort: "datetime",
    page_cursor: cursor
  }),
  "Order"
)
```

### 2. Process the Data

Use `runSubscriptionToOrderAnalysis.ts`:

```typescript
import { analyzeSubscriptionToOrder } from './runSubscriptionToOrderAnalysis'

const result = await analyzeSubscriptionToOrder(
  subscriptionEvents,
  orderEvents
)

console.log('Statistics:', result.statistics)
console.log('Cohort Data:', result.cohortData)
```

### 3. Statistics to Calculate

The analysis will provide:
- **Total subscribers**: Count of unique profiles who subscribed
- **Subscribers with orders**: Count of subscribers who placed an order
- **Conversion rate**: Percentage of subscribers who placed an order
- **Mean days to first order**: Average time from subscription to first order
- **Median days to first order**: Median time from subscription to first order
- **Standard deviation**: Variability in days to first order
- **Percentiles**: P25, P75, P90, P95

### 4. Cohort Analysis

The cohort data groups subscribers by signup week and shows:
- Number of subscribers per cohort
- Number of orders per cohort
- Conversion rate per cohort
- Average days to order per cohort
- Median days to order per cohort

## Example Output

```json
{
  "statistics": {
    "totalSubscribers": 150,
    "subscribersWithOrder": 45,
    "conversionRate": 30.0,
    "meanDaysToFirstOrder": 12.5,
    "medianDaysToFirstOrder": 8.0,
    "stdDev": 15.3,
    "percentiles": {
      "p25": 3,
      "p75": 18,
      "p90": 35,
      "p95": 52
    }
  },
  "cohortData": [
    {
      "signupDate": "2024-01-01",
      "cohortLabel": "Week of 2024-01-01",
      "subscribers": 25,
      "ordersPlaced": 8,
      "conversionRate": 32.0,
      "avgDaysToOrder": 10.5,
      "medianDaysToOrder": 7.0
    }
  ]
}
```

## Notes

- The analysis filters to only count orders that occurred **after** subscription
- Multiple subscriptions per profile: Only the **first** subscription is used
- Multiple orders per profile: Only the **first** order is used
- Time difference is calculated in **days** (rounded to nearest day)

