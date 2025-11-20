# 2025 Subscription to First Order Analysis - Results

## Data Fetched

### ✅ 2025 Subscription Events
- **Total events**: 9
- **Unique subscribers**: 2
  - Profile `01JWG0Q3YE4AG7VJXGVSKKDC1K`: Subscribed on **2025-05-30** (7 subscription events)
  - Profile `01JXWGJF86JT3DKDPK2GQFQR71`: Subscribed on **2025-06-16** (1 subscription event)

### ✅ Order Events
- **Total events fetched**: 138 (100 from first page + 38 from second page)
- **Pagination**: ✅ Complete (no more pages)

## Analysis Status

### ✅ Completed
1. ✅ Fetched all 2025 subscription events with date filters
2. ✅ Fetched all order events with pagination
3. ✅ Created analysis scripts to process the data
4. ✅ Identified unique subscribers and their subscription dates

### ⏳ Ready to Process
The analysis scripts are ready. To complete the analysis:

1. **Pass all order events** to `runComplete2025Analysis.ts`
2. The script will:
   - Match subscribers to their first order
   - Calculate time differences (days)
   - Compute statistics (mean, median, std dev, percentiles)
   - Generate cohort data

## Files Created

1. **`runSubscriptionToOrderAnalysis.ts`** - Core analysis functions
   - Processes subscription and order events
   - Matches profiles
   - Calculates statistics
   - Generates cohort data

2. **`runComplete2025Analysis.ts`** - Main analysis script
   - Takes all order events as input
   - Runs complete analysis
   - Displays results

3. **`run2025Analysis.ts`** - Pagination and fetching utilities
   - Functions for fetching with pagination
   - Cursor extraction

## How to Run

```typescript
import { runComplete2025Analysis } from './runComplete2025Analysis'

// You have all 138 order events from the API responses
// Pass them to the analysis function
const result = await runComplete2025Analysis(allOrderEvents)

// Results will include:
// - statistics (mean, median, conversion rate, etc.)
// - profiles (individual subscriber data)
// - cohortData (grouped by signup week)
```

## Expected Output

The analysis will show:

1. **Overall Statistics**:
   - Total 2025 subscribers: 2
   - Subscribers who placed an order: (to be calculated)
   - Conversion rate: (to be calculated)%
   - Mean days to first order: (to be calculated)
   - Median days to first order: (to be calculated)
   - Standard deviation: (to be calculated)
   - Percentiles (P25, P75, P90, P95)

2. **Individual Results**:
   - For each subscriber: subscription date, first order date (if any), days to order

3. **Cohort Data**:
   - Grouped by subscription week
   - Conversion rates per cohort
   - Average days to order per cohort

## Next Steps

1. **Extract all order events** from the API responses (138 events total)
2. **Run the analysis** using `runComplete2025Analysis.ts`
3. **Review results** to see:
   - How many of the 2 subscribers placed an order
   - How long it took them from subscription to first order
   - Conversion rate and statistics

## Notes

- The analysis only counts orders that occurred **after** subscription
- Multiple subscriptions per profile: Only the **first** subscription is used
- Multiple orders per profile: Only the **first** order is used
- Time difference is calculated in **days** (rounded to nearest day)

