# 2025 Subscription to First Order Analysis - Final Results

## Analysis Date
Run on: 2025-01-30

## Summary

### Data Fetched
- ✅ **2025 Subscription Events**: 9 events (2 unique subscribers)
- ✅ **Order Events**: 138 events (all fetched with pagination)

### Results

| Metric | Value |
|--------|-------|
| **Total 2025 Subscribers** | 2 |
| **Subscribers who placed an order** | 0 |
| **Conversion Rate** | 0.00% |
| **Mean Days to First Order** | N/A (no orders) |
| **Median Days to First Order** | N/A (no orders) |
| **Standard Deviation** | N/A (no orders) |

## Individual Results

### Profile: 01JWG0Q3YE4AG7VJXGVSKKDC1K
- **Subscribed**: 2025-05-30
- **First Order**: None
- **Days to Order**: N/A

### Profile: 01JXWGJF86JT3DKDPK2GQFQR71
- **Subscribed**: 2025-06-16
- **First Order**: None
- **Days to Order**: N/A

## Analysis Details

### Methodology
1. Fetched all subscription events from 2025 (Jan 1 - Dec 31, 2025)
2. Fetched all order events with pagination (138 total events)
3. Matched subscribers to their first order (if any)
4. Calculated time differences (days from subscription to first order)
5. Computed statistics

### Key Findings
- **2 unique subscribers** joined the list in 2025
- **0 subscribers** have placed an order as of the analysis date
- **Conversion rate**: 0% (no orders placed yet)
- Both subscribers joined in May-June 2025 and have not placed orders yet

### Notes
- This analysis only counts orders that occurred **after** subscription
- Multiple subscriptions per profile: Only the **first** subscription is used
- Multiple orders per profile: Only the **first** order is used
- Time difference is calculated in **days** (rounded to nearest day)
- The analysis covers the full year 2025 (through end of December)

## Files Created

1. `runSubscriptionToOrderAnalysis.ts` - Core analysis functions
2. `runComplete2025Analysis.ts` - Main analysis script
3. `runAnalysisNow.ts` - Ready-to-run analysis
4. `2025_ANALYSIS_RESULTS.md` - This results document

## How to Re-run

To re-run this analysis:

```typescript
import { runComplete2025Analysis } from './runComplete2025Analysis'

// Fetch all order events with pagination
const allOrderEvents = await fetchAllOrders()

// Run analysis
const result = await runComplete2025Analysis(allOrderEvents)
```

## Future Analysis

To track progress:
- Re-run this analysis periodically to see if subscribers place orders
- Once orders are placed, the analysis will automatically calculate:
  - Mean/median days to first order
  - Standard deviation
  - Percentiles (P25, P75, P90, P95)
  - Cohort breakdown by signup week

