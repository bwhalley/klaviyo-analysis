# Shipping Speed Impact on Repeat Purchase - Implementation Plan

## 📊 Report Goal
Understand the impact of shipping speed/delivery time on time-to-repeat-purchase behavior.

---

## 🎯 Key Questions to Answer
1. Does faster shipping lead to faster repeat purchases?
2. Which shipping methods correlate with the highest repeat purchase rates?
3. What is the optimal delivery time for maximizing repeat purchases?
4. How does actual delivery time (vs promised shipping speed) affect behavior?

---

## 📥 Data Requirements

### 1. **Placed Order Events** (`metric: "Placed Order"`)

**Event Properties Needed:**
```javascript
{
  $event_id: string,           // Unique event identifier
  $value: number,              // Order total
  datetime: string,            // When order was placed
  profile_id: string,          // Customer profile
  
  // Shipping-related properties (need to verify exact property names in Klaviyo)
  shipping_method: string,     // e.g., "Standard", "Express", "Next Day"
  shipping_rate: string,       // Shopify shipping rate title
  shipping_price: number,      // Cost of shipping
  
  // Order details
  order_id: string,           // To correlate with delivery events
  item_count: number,
  // ... other order properties
}
```

**Filters to Apply:**
- Date range filter on `datetime`
- Optional: filter by product category, order value, etc.

**What We Calculate:**
- First order date per profile (lifetime)
- Second order date per profile (lifetime)
- Order details for correlation

---

### 2. **Shipment Delivered Events** (`metric: "Shipment Delivered"` or similar)

**Event Properties Needed:**
```javascript
{
  datetime: string,            // When shipment was delivered
  profile_id: string,          // Customer profile
  order_id: string,            // To correlate with order
  tracking_number: string,     // For reference
}
```

**What We Calculate:**
- Delivery date - Order date = Delivery duration
- Quartiles of delivery duration by shipping method

---

### 3. **Profile-Level Aggregations**

For each profile in the analysis:
```javascript
{
  profile_id: string,
  email: string,
  
  // First Order
  first_order_date: Date,
  first_order_id: string,
  first_order_shipping_method: string,
  first_order_shipping_rate: string,
  first_order_delivery_date: Date | null,
  first_order_delivery_duration_days: number | null,
  
  // Second Order
  second_order_date: Date | null,
  second_order_id: string | null,
  days_to_second_order: number | null,
  
  // Cohort Information
  cohort_period: string,       // e.g., "2024-W12" for weekly cohorts
  shipping_rate_group: string, // Standardized shipping rate
  delivery_duration_quartile: string, // "Q1" (fastest) to "Q4" (slowest)
}
```

---

## 🔄 Data Gathering Strategy

### Phase 1: Event Collection
```typescript
// Pseudo-code flow
async function gatherShippingImpactData(startDate, endDate) {
  // Step 1: Get all "Placed Order" events in time window
  const orderEvents = await klaviyoService.getAllEvents(
    METRIC_IDS.PLACED_ORDER,
    startDate,
    endDate
  )
  
  // Step 2: Get all "Shipment Delivered" events in time window
  // (extend time window by ~30 days to capture deliveries of late orders)
  const deliveryEvents = await klaviyoService.getAllEvents(
    METRIC_IDS.SHIPMENT_DELIVERED,
    startDate,
    addDays(endDate, 30)
  )
  
  // Step 3: Get ALL orders for each profile to determine lifetime order sequence
  const profileIds = [...new Set(orderEvents.map(e => e.profile_id))]
  const allOrdersByProfile = await getHistoricalOrders(profileIds)
  
  return { orderEvents, deliveryEvents, allOrdersByProfile }
}
```

### Phase 2: Data Enrichment & Linkage
```typescript
function enrichOrderData(orderEvents, deliveryEvents, allOrdersByProfile) {
  // For each order event:
  // 1. Determine if this is customer's 1st, 2nd, 3rd... order (lifetime)
  // 2. Link to corresponding delivery event (by order_id)
  // 3. Calculate delivery duration
  
  const enrichedOrders = orderEvents.map(order => {
    const profile = allOrdersByProfile[order.profile_id]
    const orderIndex = profile.findIndex(o => o.order_id === order.order_id)
    
    const delivery = deliveryEvents.find(d => 
      d.order_id === order.order_id
    )
    
    return {
      ...order,
      lifetime_order_number: orderIndex + 1,
      is_first_order: orderIndex === 0,
      is_second_order: orderIndex === 1,
      delivery_date: delivery?.datetime,
      delivery_duration_days: delivery 
        ? daysBetween(order.datetime, delivery.datetime)
        : null
    }
  })
  
  return enrichedOrders
}
```

### Phase 3: Profile Aggregation
```typescript
function buildProfileTimelines(enrichedOrders) {
  const profileMap = new Map()
  
  // Group orders by profile
  for (const order of enrichedOrders) {
    if (!profileMap.has(order.profile_id)) {
      profileMap.set(order.profile_id, [])
    }
    profileMap.get(order.profile_id).push(order)
  }
  
  // Build timeline for each profile
  const timelines = []
  for (const [profileId, orders] of profileMap) {
    const sortedOrders = orders.sort((a, b) => 
      new Date(a.datetime) - new Date(b.datetime)
    )
    
    const firstOrder = sortedOrders[0]
    const secondOrder = sortedOrders[1] || null
    
    // Only include profiles who placed first order in analysis window
    if (isInWindow(firstOrder.datetime, startDate, endDate)) {
      timelines.push({
        profile_id: profileId,
        first_order: {
          date: firstOrder.datetime,
          order_id: firstOrder.order_id,
          shipping_method: firstOrder.shipping_method,
          shipping_rate: firstOrder.shipping_rate,
          delivered_date: firstOrder.delivery_date,
          delivery_duration_days: firstOrder.delivery_duration_days,
        },
        second_order: secondOrder ? {
          date: secondOrder.datetime,
          order_id: secondOrder.order_id,
          days_since_first: daysBetween(firstOrder.datetime, secondOrder.datetime)
        } : null,
        cohort_period: getCohortPeriod(firstOrder.datetime, 'week'),
        shipping_rate_group: normalizeShippingRate(firstOrder.shipping_rate),
      })
    }
  }
  
  return timelines
}
```

### Phase 4: Calculate Delivery Duration Quartiles
```typescript
function calculateQuartiles(timelines) {
  // Group by shipping rate
  const byShippingRate = groupBy(timelines, t => t.shipping_rate_group)
  
  const quartileMap = new Map()
  
  for (const [shippingRate, profiles] of byShippingRate) {
    // Get all delivery durations (excluding null)
    const durations = profiles
      .map(p => p.first_order.delivery_duration_days)
      .filter(d => d !== null)
      .sort((a, b) => a - b)
    
    if (durations.length >= 4) {
      const quartiles = {
        q1: percentile(durations, 25),
        q2: percentile(durations, 50), // median
        q3: percentile(durations, 75),
      }
      
      // Assign quartile to each profile
      profiles.forEach(profile => {
        const duration = profile.first_order.delivery_duration_days
        if (duration === null) {
          profile.delivery_quartile = 'unknown'
        } else if (duration <= quartiles.q1) {
          profile.delivery_quartile = 'Q1_fastest'
        } else if (duration <= quartiles.q2) {
          profile.delivery_quartile = 'Q2_fast'
        } else if (duration <= quartiles.q3) {
          profile.delivery_quartile = 'Q3_slow'
        } else {
          profile.delivery_quartile = 'Q4_slowest'
        }
      })
      
      quartileMap.set(shippingRate, quartiles)
    }
  }
  
  return { timelines, quartileMap }
}
```

---

## 📊 Aggregation & Analysis

### Cohort Matrix Structure
```typescript
interface CohortCell {
  cohort_period: string          // e.g., "2024-W12"
  shipping_rate: string           // e.g., "Standard Shipping"
  delivery_quartile: string       // "Q1_fastest" to "Q4_slowest"
  
  // Core metrics
  total_customers: number         // Total who placed first order
  customers_with_delivery: number // Have delivery tracking
  avg_delivery_days: number       // Average delivery time
  
  // Repeat purchase metrics by day bucket
  repeat_by_day: {
    day_0_7: number,              // Repeat purchases in 0-7 days
    day_8_14: number,
    day_15_30: number,
    day_31_60: number,
    day_61_90: number,
    day_91_plus: number,
  }
  
  // Cumulative repeat rate
  repeat_rate_7d: number,         // % who repurchased within 7 days
  repeat_rate_30d: number,        // % who repurchased within 30 days
  repeat_rate_60d: number,
  repeat_rate_90d: number,
  
  // Statistical
  median_days_to_repeat: number | null,
  avg_days_to_repeat: number | null,
}
```

### Aggregation Logic
```typescript
function aggregateCohortData(timelines, cohortPeriod = 'week') {
  // Group by: cohort_period × shipping_rate × delivery_quartile
  const cohortCells = new Map()
  
  for (const profile of timelines) {
    const key = `${profile.cohort_period}|${profile.shipping_rate_group}|${profile.delivery_quartile}`
    
    if (!cohortCells.has(key)) {
      cohortCells.set(key, {
        cohort_period: profile.cohort_period,
        shipping_rate: profile.shipping_rate_group,
        delivery_quartile: profile.delivery_quartile,
        profiles: [],
      })
    }
    
    cohortCells.get(key).profiles.push(profile)
  }
  
  // Calculate metrics for each cell
  const results = []
  for (const [key, cell] of cohortCells) {
    const profilesWithRepeat = cell.profiles.filter(p => p.second_order !== null)
    const daysToRepeat = profilesWithRepeat.map(p => p.second_order.days_since_first)
    
    results.push({
      cohort_period: cell.cohort_period,
      shipping_rate: cell.shipping_rate,
      delivery_quartile: cell.delivery_quartile,
      
      total_customers: cell.profiles.length,
      customers_with_delivery: cell.profiles.filter(p => 
        p.first_order.delivery_duration_days !== null
      ).length,
      avg_delivery_days: average(
        cell.profiles
          .map(p => p.first_order.delivery_duration_days)
          .filter(d => d !== null)
      ),
      
      repeat_by_day: {
        day_0_7: daysToRepeat.filter(d => d <= 7).length,
        day_8_14: daysToRepeat.filter(d => d > 7 && d <= 14).length,
        day_15_30: daysToRepeat.filter(d => d > 14 && d <= 30).length,
        day_31_60: daysToRepeat.filter(d => d > 30 && d <= 60).length,
        day_61_90: daysToRepeat.filter(d => d > 60 && d <= 90).length,
        day_91_plus: daysToRepeat.filter(d => d > 90).length,
      },
      
      repeat_rate_7d: profilesWithRepeat.filter(p => p.second_order.days_since_first <= 7).length / cell.profiles.length,
      repeat_rate_30d: profilesWithRepeat.filter(p => p.second_order.days_since_first <= 30).length / cell.profiles.length,
      repeat_rate_60d: profilesWithRepeat.filter(p => p.second_order.days_since_first <= 60).length / cell.profiles.length,
      repeat_rate_90d: profilesWithRepeat.filter(p => p.second_order.days_since_first <= 90).length / cell.profiles.length,
      
      median_days_to_repeat: daysToRepeat.length > 0 ? median(daysToRepeat) : null,
      avg_days_to_repeat: daysToRepeat.length > 0 ? average(daysToRepeat) : null,
    })
  }
  
  return results
}
```

---

## 🗄️ Data Storage Strategy

### Option 1: In-Memory Processing (Recommended for MVP)
- Fetch all events from Klaviyo
- Process entirely in memory
- Store final results in `Analysis.results` JSON field
- **Pros**: Simple, no schema changes
- **Cons**: Re-fetch data each time, longer processing

### Option 2: Cache Intermediate Data
```sql
-- New table for caching order events
CREATE TABLE order_event_cache (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  profile_id VARCHAR NOT NULL,
  order_id VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL, -- 'placed_order' or 'delivered'
  event_date TIMESTAMP NOT NULL,
  event_properties JSONB NOT NULL,
  lifetime_order_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_profile_order (profile_id, order_id),
  INDEX idx_user_date (user_id, event_date)
);
```

### Option 3: Extended Analysis Model
```prisma
model ShippingAnalysis {
  id                String   @id @default(uuid())
  userId            String   @map("user_id")
  name              String
  status            String   @default("pending")
  params            Json     @default("{}")
  
  // Results broken down by section
  cohortData        Json?    @map("cohort_data")
  quartileData      Json?    @map("quartile_data")
  profileTimelines  Json?    @map("profile_timelines")
  
  // Standard fields
  createdAt         DateTime @default(now())
  startedAt         DateTime? @map("started_at")
  completedAt       DateTime? @map("completed_at")
  
  user              User     @relation(fields: [userId], references: [id])
  @@map("shipping_analyses")
}
```

**Recommendation**: Start with Option 1 (in-memory), migrate to Option 3 if needed.

---

## 🎨 UI/Visualization Plan

### Report Configuration Form
```
┌─────────────────────────────────────────┐
│ Shipping Impact Analysis Configuration │
├─────────────────────────────────────────┤
│                                         │
│ Date Range:                             │
│ [Last 90 Days ▼]                        │
│ From: [2024-01-01] To: [2024-03-31]    │
│                                         │
│ Cohort Period:                          │
│ ○ Daily  ● Weekly  ○ Monthly           │
│                                         │
│ Group By:                               │
│ [Shipping Rate ▼]                       │
│ Options: Shipping Rate, Shipping Method │
│                                         │
│ Filters (Optional):                     │
│ Order Value: [Min $___] [Max $___]     │
│ Product Category: [All ▼]              │
│                                         │
│ [Start Analysis]                        │
└─────────────────────────────────────────┘
```

### Results Visualization

**Tab 1: Cohort Matrix View**
```
Cohort Performance by Shipping Rate & Delivery Speed

Shipping Rate: [Standard ▼] [Express] [Next Day]

                  Q1 (Fastest)    Q2 (Fast)      Q3 (Slow)      Q4 (Slowest)
Week of Jan 1    1,234 customers  987 customers  856 customers  645 customers
  Avg Delivery:  2.3 days        4.1 days       6.8 days       9.5 days
  30d Repeat:    23.4%           19.2%          16.8%          14.1%
  60d Repeat:    35.6%           31.2%          27.5%          23.8%
  90d Repeat:    42.1%           38.4%          34.2%          29.7%
  
Week of Jan 8    ...
```

**Tab 2: Time-to-Repeat Distribution**
```
Time to Second Purchase by Shipping Speed

[Histogram/Bar Chart]
X-axis: Days since first order (0-7, 8-14, 15-30, 31-60, 61-90, 91+)
Y-axis: % of customers who made repeat purchase
Series: One line per quartile (Q1-Q4)

Shows: Faster delivery → faster repeat purchases (hypothesis)
```

**Tab 3: Shipping Rate Comparison**
```
Repeat Purchase Rate by Shipping Method

[Table with sorting/filtering]
Shipping Rate    Customers  Avg Delivery  30d Repeat  60d Repeat  90d Repeat
Standard         4,532      5.2 days      18.3%       29.8%       36.4%
Express          1,245      2.8 days      24.1%       37.2%       44.8%
Next Day         389        1.2 days      28.7%       41.3%       49.2%
```

**Tab 4: Individual Profile Explorer**
```
Profile Timeline View (for debugging/validation)

[Search by email or profile ID]

Profile: john@example.com (ID: xyz123)

Timeline:
─────●──────────●─────────────────────────────>
     Jan 15     Feb 3
     
Order #1 (Jan 15, 2024)
  Shipping: Standard (5-7 days)
  Delivered: Jan 20 (5 days)
  Delivery Quartile: Q2 (Fast)
  
Order #2 (Feb 3, 2024)
  Days since first order: 19 days
  
Cohort: 2024-W03
Shipping Rate Group: Standard
```

---

## 🔍 Key Challenges & Solutions

### Challenge 1: Determining Lifetime Order Sequence
**Problem**: Klaviyo events may not have a direct "lifetime order number" property.

**Solution**:
- Fetch ALL "Placed Order" events for each profile (no date filter)
- Sort by datetime
- Assign sequence numbers
- Cache results to avoid repeated fetches

### Challenge 2: Linking Orders to Deliveries
**Problem**: Need to match order events to delivery events.

**Solution**:
- Use `order_id` property to link
- If order_id not available, use combination of profile + datetime proximity
- Handle missing delivery data gracefully (show as "unknown")

### Challenge 3: Standardizing Shipping Rates
**Problem**: Shopify shipping rates may have inconsistent naming.

**Solution**:
```typescript
function normalizeShippingRate(rate: string): string {
  const normalized = rate.toLowerCase().trim()
  
  if (normalized.includes('express') || normalized.includes('2-day')) {
    return 'Express'
  } else if (normalized.includes('next day') || normalized.includes('overnight')) {
    return 'Next Day'
  } else if (normalized.includes('standard') || normalized.includes('ground')) {
    return 'Standard'
  } else {
    return 'Other'
  }
}
```

### Challenge 4: Large Data Volumes
**Problem**: Many customers with long order histories.

**Solution**:
- Implement pagination for profile-level queries
- Use streaming/chunking for large result sets
- Consider caching strategy (Option 2 above)
- Show progress indicator during processing

### Challenge 5: Statistical Significance
**Problem**: Small sample sizes in some cohort cells.

**Solution**:
- Display sample size prominently
- Flag cells with < 30 customers as "insufficient data"
- Provide confidence intervals for rates
- Allow filtering by minimum cohort size

---

## 📋 Implementation Phases

### Phase 1: Data Foundation (Week 1)
- [ ] Create new service methods for order/delivery event fetching
- [ ] Implement profile order history aggregation
- [ ] Build order-delivery linking logic
- [ ] Create data enrichment pipeline
- [ ] Unit tests for data processing

### Phase 2: Analysis Engine (Week 2)
- [ ] Implement profile timeline builder
- [ ] Create quartile calculation logic
- [ ] Build cohort aggregation engine
- [ ] Calculate repeat purchase metrics
- [ ] Integration tests

### Phase 3: API & Storage (Week 3)
- [ ] Create API endpoint for shipping analysis
- [ ] Extend Analysis model or create new model
- [ ] Implement background job processing
- [ ] Add progress tracking
- [ ] Error handling & logging

### Phase 4: Frontend (Week 4)
- [ ] Configuration form component
- [ ] Cohort matrix visualization
- [ ] Time-to-repeat charts
- [ ] Shipping rate comparison table
- [ ] Profile explorer for debugging

### Phase 5: Polish & Optimization
- [ ] Performance optimization
- [ ] Caching strategy
- [ ] Export functionality (CSV/JSON)
- [ ] Documentation
- [ ] User testing

---

## 🧪 Testing Strategy

### Data Validation Tests
```typescript
describe('Order Timeline Builder', () => {
  it('correctly identifies first and second orders', () => {})
  it('handles profiles with only one order', () => {})
  it('filters to only orders in analysis window', () => {})
  it('links orders to delivery events by order_id', () => {})
  it('calculates delivery duration correctly', () => {})
})

describe('Quartile Calculation', () => {
  it('assigns quartiles correctly for even distribution', () => {})
  it('handles edge cases (ties, outliers)', () => {})
  it('calculates separate quartiles per shipping rate', () => {})
})

describe('Cohort Aggregation', () => {
  it('groups by cohort period, shipping rate, quartile', () => {})
  it('calculates repeat rates correctly', () => {})
  it('handles missing data gracefully', () => {})
})
```

### Integration Tests
- Mock Klaviyo API responses
- Test full pipeline with sample data
- Verify results match manual calculations

---

## 📊 Example Output Structure

```json
{
  "analysis_id": "uuid",
  "params": {
    "start_date": "2024-01-01",
    "end_date": "2024-03-31",
    "cohort_period": "week"
  },
  "summary": {
    "total_profiles": 5432,
    "profiles_with_delivery": 4987,
    "profiles_with_repeat": 1876,
    "overall_repeat_rate_30d": 0.186,
    "overall_repeat_rate_90d": 0.345
  },
  "shipping_rates": [
    {
      "rate": "Standard",
      "customer_count": 4123,
      "avg_delivery_days": 5.2,
      "quartile_thresholds": {
        "q1": 3.0,
        "q2": 5.0,
        "q3": 7.0
      }
    },
    // ... more rates
  ],
  "cohorts": [
    {
      "cohort_period": "2024-W01",
      "shipping_rate": "Standard",
      "delivery_quartile": "Q1_fastest",
      "total_customers": 234,
      "avg_delivery_days": 2.3,
      "repeat_rate_30d": 0.234,
      "repeat_rate_60d": 0.356,
      "repeat_rate_90d": 0.421,
      "median_days_to_repeat": 28,
      "repeat_distribution": {
        "0-7d": 15,
        "8-14d": 23,
        "15-30d": 17,
        "31-60d": 22,
        "61-90d": 11,
        "91+d": 8
      }
    },
    // ... more cohort cells
  ],
  "profile_timelines": [
    // Optional: store for drill-down
  ]
}
```

---

## 🎯 Success Metrics

The implementation is successful if:
1. ✅ Accurately identifies first-time vs repeat customers
2. ✅ Correctly links orders to delivery events (>90% match rate)
3. ✅ Calculates delivery quartiles per shipping method
4. ✅ Produces cohort matrix with repeat purchase rates
5. ✅ Processes 10K+ orders in < 2 minutes
6. ✅ UI clearly shows correlation between delivery speed and repeat behavior
7. ✅ Results are exportable and reproducible

---

## ❓ Open Questions

1. **Event Property Names**: What are the exact property names in Klaviyo for:
   - Shipping method/rate?
   - Order ID for linking?
   - What is the exact metric name for delivery events?

2. **Date Range**: Should we analyze only first orders in window, or include all orders?
   - Current plan: First orders in window only (cleaner cohorts)

3. **Statistical Significance**: Should we auto-hide cohorts with < N customers?
   - Recommendation: Yes, flag cells with < 30 customers

4. **Caching**: Should we cache order histories or re-fetch each time?
   - Start without caching, add if performance issues

5. **Delivery Events**: Are delivery events always tracked? What % have them?
   - Need to handle gracefully if missing

---

## 🚀 Next Steps

1. **Review this plan** - Discuss any concerns or modifications
2. **Validate Klaviyo event structure** - Examine actual event properties
3. **Create test dataset** - Sample events for development
4. **Begin Phase 1** - Start with data foundation

---

**Ready to proceed?** Let me know if you want to modify any part of this plan before we begin implementation!

