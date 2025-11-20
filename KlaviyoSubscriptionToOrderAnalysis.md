# Klaviyo Subscription to First Order Analysis

This guide explains how to create a report analyzing the time from email subscription to first order using Klaviyo MCP server functions.

## Overview

The analysis calculates:
- **Median and mean** time (in days) from subscription to first order
- **Conversion rate**: percentage of subscribers who placed an order
- **Cohort analysis**: Group subscribers by signup period and track when they convert
- **Distribution**: Breakdown by time ranges (0-7 days, 8-14 days, etc.)

## Approach

### Step 1: Get Metric IDs

First, identify the Klaviyo metrics you need:

```typescript
// Get all metrics
const metrics = await mcp_klaviyo_klaviyo_get_metrics({
  model: "claude",
  fields: ["name"]
})

// Find the specific metrics
const subscribedMetric = metrics.data.find(
  m => m.name === "Subscribed to List"
)
const placedOrderMetric = metrics.data.find(
  m => m.name === "Placed Order"
)
```

### Step 2: Fetch Subscription Events

Get all "Subscribed to List" events:

```typescript
const subscriptionEvents = await mcp_klaviyo_klaviyo_get_events({
  model: "claude",
  events_fields: ["timestamp", "datetime", "uuid"],
  filters: [
    {
      field: "metric_id",
      operator: "equals",
      value: subscribedMetric.id
    },
    // Optional: filter by date range
    {
      field: "datetime",
      operator: "greater-or-equal",
      value: "2024-01-01T00:00:00Z"
    }
  ],
  sort: "datetime" // Sort chronologically
})
```

**Important**: For each profile, you'll want to keep only their **first** subscription event.

### Step 3: Fetch Placed Order Events

Get all "Placed Order" events:

```typescript
const orderEvents = await mcp_klaviyo_klaviyo_get_events({
  model: "claude",
  events_fields: ["timestamp", "datetime", "uuid"],
  filters: [
    {
      field: "metric_id",
      operator: "equals",
      value: placedOrderMetric.id
    }
  ],
  sort: "datetime"
})
```

**Important**: For each profile, you'll want to keep only their **first** order event.

### Step 4: Match Subscriptions to Orders

For each subscriber:
1. Find their subscription date (first "Subscribed to List" event)
2. Find their first order date (first "Placed Order" event), if any
3. Calculate time difference in days
4. Filter out cases where order came before subscription (edge cases)

### Step 5: Calculate Statistics

```typescript
// Mean
const meanDays = sum(daysToOrder) / count

// Median
const sortedDays = [...daysToOrder].sort((a, b) => a - b)
const medianDays = sortedDays[Math.floor(sortedDays.length / 2)]

// Percentiles
const p25 = sortedDays[Math.floor(sortedDays.length * 0.25)]
const p75 = sortedDays[Math.floor(sortedDays.length * 0.75)]
const p90 = sortedDays[Math.floor(sortedDays.length * 0.90)]

// Standard deviation
const variance = sum((days - mean)^2) / count
const stdDev = sqrt(variance)
```

### Step 6: Generate Cohort Data

Group subscribers by their signup period (week or month):

```typescript
// Group by week (Monday of the week)
const signupDate = new Date(subscriptionEvent.datetime)
const dayOfWeek = signupDate.getDay()
const diff = signupDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
const monday = new Date(signupDate.setDate(diff))
const cohortKey = `Week of ${monday.toISOString().split('T')[0]}`
```

For each cohort:
- Count total subscribers
- Count subscribers who placed an order
- Calculate average and median days to first order
- Create distribution by day ranges

## Data Structure

### Statistics Output

```typescript
{
  totalSubscribers: number
  subscribersWithOrder: number
  conversionRate: number        // subscribersWithOrder / totalSubscribers
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
```

### Cohort Data Output

```typescript
[
  {
    signupDate: "2024-01-01",
    cohortLabel: "Week of 2024-01-01",
    subscribers: 150,
    ordersPlaced: 45,
    conversionRate: 0.30,
    avgDaysToOrder: 18.5,
    medianDaysToOrder: 14,
    dayRanges: {
      "0-7 days": 10,
      "8-14 days": 15,
      "15-30 days": 12,
      "31-60 days": 5,
      "61-90 days": 2,
      "91+ days": 1
    }
  },
  // ... more cohorts
]
```

## Cohort Chart Visualization

### Example Chart Structure

**X-axis**: Cohort periods (weeks/months)
**Y-axis**: Days to first order OR Conversion rate
**Color/Size**: Number of subscribers or conversion percentage

### Recommended Visualizations

1. **Cohort Heatmap**: Show conversion rate by cohort and days to order
   - X-axis: Days since signup (0-7, 8-14, etc.)
   - Y-axis: Cohort periods
   - Color: Conversion percentage

2. **Time-to-Order Trend**: Line chart showing median/mean days over time
   - X-axis: Cohort periods
   - Y-axis: Days to first order
   - Multiple lines: Mean, Median, P25, P75

3. **Distribution Bar Chart**: Stacked bars showing distribution by day ranges
   - X-axis: Cohort periods
   - Y-axis: Number of subscribers
   - Stacked segments: Each day range bucket

## Implementation Notes

### Pagination

Klaviyo events API may require pagination. Use the `page_cursor` parameter:

```typescript
let pageCursor = null
let allEvents = []

do {
  const response = await mcp_klaviyo_klaviyo_get_events({
    // ... other params
    page_cursor: pageCursor
  })
  
  allEvents = [...allEvents, ...response.data]
  pageCursor = response.links?.next || null
} while (pageCursor)
```

### Performance Considerations

- Filter events by date range to reduce data volume
- Process events in batches if dealing with large datasets
- Consider using database queries if you have Klaviyo events stored locally (see `klaviyo_profile_events` table)

### Edge Cases

- Some subscribers may have placed orders before subscribing (filter these out)
- Some subscribers may have multiple subscription events (use only the first)
- Some subscribers may never place an order (include in "never" bucket)

## Database Alternative

If you have Klaviyo events stored in your database (`klaviyo_profile_events` table), you can query directly:

```sql
-- Find first subscription and first order per profile
WITH subscriptions AS (
  SELECT DISTINCT ON (klaviyo_profile_id)
    klaviyo_profile_id,
    datetime as subscribed_at
  FROM klaviyo_profile_events kpe
  JOIN klaviyo_metrics km ON kpe.klaviyo_metric_id = km.klaviyo_id
  WHERE km.name = 'Subscribed to List'
  ORDER BY klaviyo_profile_id, datetime ASC
),
first_orders AS (
  SELECT DISTINCT ON (klaviyo_profile_id)
    klaviyo_profile_id,
    datetime as first_order_at
  FROM klaviyo_profile_events kpe
  JOIN klaviyo_metrics km ON kpe.klaviyo_metric_id = km.klaviyo_id
  WHERE km.name = 'Placed Order'
  ORDER BY klaviyo_profile_id, datetime ASC
)
SELECT
  s.klaviyo_profile_id,
  s.subscribed_at,
  o.first_order_at,
  CASE
    WHEN o.first_order_at IS NOT NULL AND o.first_order_at >= s.subscribed_at
    THEN EXTRACT(EPOCH FROM (o.first_order_at - s.subscribed_at)) / 86400
    ELSE NULL
  END as days_to_first_order
FROM subscriptions s
LEFT JOIN first_orders o ON s.klaviyo_profile_id = o.klaviyo_profile_id
WHERE s.subscribed_at >= '2024-01-01'
ORDER BY s.subscribed_at
```

## Next Steps

1. Review the implementation in `webapps/tools/scripts/klaviyoSubscriptionToOrderAnalysis.ts`
2. Adapt the code to work with your MCP server environment
3. Create visualization components for the cohort chart
4. Set up scheduled reports or dashboards

