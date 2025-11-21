# Flexible Metric Selection Feature

**Status:** ✅ Complete  
**Date:** 2025-11-20  
**Branch:** `refactor/code-improvements`  
**Commit:** `e4a5e99`

---

## 🎯 Overview

Transformed the Klaviyo Analysis tool from a specific **"subscription-to-order"** analyzer into a **general-purpose cohort analysis tool** that works with ANY two metrics in a Klaviyo account.

### Before
- ❌ Hardcoded to analyze "Subscribed to List" → "Placed Order"
- ❌ Single use case only
- ❌ Required code changes to analyze different metrics

### After
- ✅ Dynamic metric selection via dropdown menus
- ✅ Works with ANY two metrics from Klaviyo
- ✅ No code changes needed for new analyses
- ✅ Versatile tool for various marketing scenarios

---

## 🚀 Features Implemented

### 1. Metric Selection UI

**New Analysis Page (`/analysis/new`)**
- Fetches all metrics from user's Klaviyo account
- Displays two dropdowns:
  - **Start Metric**: The trigger event (e.g., "Subscribed to List", "Email Opened")
  - **Conversion Metric**: The goal event (e.g., "Placed Order", "Link Clicked")
- Loading state while fetching metrics
- Error handling for API failures
- Submit button disabled until metrics load

**User Flow:**
1. Navigate to "Create New Analysis"
2. Select start metric from dropdown
3. Select conversion metric from dropdown
4. Choose cohort period (day/week/month)
5. Click "Start Analysis"

### 2. New API Endpoint

**`GET /api/metrics`**
- Fetches all metrics from Klaviyo API
- Requires authentication
- Returns simplified metric list:
  ```json
  {
    "metrics": [
      {
        "id": "UfyMVA",
        "name": "Subscribed to List",
        "created": "2023-01-15T10:00:00Z",
        "updated": "2024-11-20T15:30:00Z"
      },
      ...
    ],
    "total": 45
  }
  ```
- Cached for 1 hour for performance
- Sorted alphabetically by name

### 3. Enhanced Analysis API

**`POST /api/analysis`**

**New Required Fields:**
```json
{
  "name": "Q1 Email Engagement Analysis",
  "startMetricId": "UfyMVA",
  "conversionMetricId": "UhZHSf",
  "cohortPeriod": "week"
}
```

**Validation:**
- `startMetricId` - Required, must be valid Klaviyo metric ID
- `conversionMetricId` - Required, must be valid Klaviyo metric ID
- `cohortPeriod` - Optional, defaults to "week"

### 4. Updated Services

**KlaviyoService**
```typescript
// New method
async getAllEvents(metricId: string): Promise<KlaviyoEvent[]>

// Deprecated (still works for backward compatibility)
async getSubscriptionEvents(): Promise<KlaviyoEvent[]>
async getOrderEvents(): Promise<KlaviyoEvent[]>
```

**AnalysisService**
```typescript
// Updated signature
async runAnalysis(
  startEvents: any[],
  conversionEvents: any[],
  cohortPeriod: 'day' | 'week' | 'month' = 'week'
): Promise<{
  statistics: Statistics
  cohortData: CohortDataPoint[]
  profiles: ProfileData[]
}>
```

**Cohort Period Support:**
- `day` - Groups by specific date (2025-01-15)
- `week` - Groups by ISO week (2025-W03)
- `month` - Groups by month (2025-01)

---

## 💡 Example Use Cases

### 1. Email Engagement Funnel
**Start:** Email Opened  
**Conversion:** Link Clicked  
**Insight:** How long does it take subscribers to click links after opening?

### 2. E-commerce Funnel
**Start:** Product Viewed  
**Conversion:** Added to Cart  
**Insight:** Product browsing to cart addition behavior

### 3. SaaS Onboarding
**Start:** Trial Started  
**Conversion:** Subscription Activated  
**Insight:** Trial-to-paid conversion timeline

### 4. Webinar Analytics
**Start:** Webinar Registered  
**Conversion:** Webinar Attended  
**Insight:** Registration to attendance rates

### 5. Content Marketing
**Start:** Blog Post Viewed  
**Conversion:** Newsletter Subscribed  
**Insight:** Content engagement to subscription path

### 6. Re-engagement Campaign
**Start:** Win-back Email Sent  
**Conversion:** Store Visit  
**Insight:** Re-engagement campaign effectiveness

---

## 🔧 Technical Implementation

### API Flow

```
┌─────────────┐
│   User      │
│   Browser   │
└──────┬──────┘
       │
       │ 1. GET /api/metrics
       ▼
┌─────────────────────┐
│  Metrics API        │
│  - Auth check       │
│  - Decrypt API key  │
│  - Fetch from cache │
│  - Or call Klaviyo  │
└──────┬──────────────┘
       │
       │ 2. Display dropdowns
       │ 3. User selects metrics
       │
       ▼
┌─────────────────────┐
│  Analysis API       │
│  - Validate metrics │
│  - Create record    │
│  - Run async        │
└──────┬──────────────┘
       │
       │ 4. Background job
       ▼
┌─────────────────────┐
│ runAnalysisBackground│
│  - Fetch events     │
│  - Process data     │
│  - Calculate stats  │
│  - Save results     │
└─────────────────────┘
```

### Data Flow

```typescript
// 1. User selects metrics in UI
{ startMetricId: "ABC123", conversionMetricId: "XYZ789" }

// 2. API stores in analysis.params (JSONB)
{
  name: "My Analysis",
  params: {
    startMetricId: "ABC123",
    conversionMetricId: "XYZ789",
    cohortPeriod: "week"
  }
}

// 3. Background job fetches events
startEvents = await klaviyoService.getAllEvents("ABC123")
conversionEvents = await klaviyoService.getAllEvents("XYZ789")

// 4. Analysis runs with dynamic data
results = await analysisService.runAnalysis(
  startEvents, 
  conversionEvents,
  "week"
)
```

---

## 📊 Performance Considerations

### Caching Strategy
- **Metrics List:** Cached for 1 hour (metrics rarely change)
- **Events Data:** Not cached (always fresh for accuracy)
- **Analysis Results:** Stored in database permanently

### Optimization
- Metrics fetched once and cached per session
- Dropdowns pre-populated for instant UX
- Background processing prevents UI blocking
- Pagination for large event sets

---

## 🧪 Testing

### Manual Testing Steps

1. **Test Metric Loading**
   ```bash
   # Login and navigate to /analysis/new
   # Verify metrics load in both dropdowns
   # Verify loading state displays correctly
   ```

2. **Test Analysis Creation**
   ```bash
   # Select "Subscribed to List" as start metric
   # Select "Placed Order" as conversion metric
   # Choose "week" as cohort period
   # Submit and verify redirect to results page
   ```

3. **Test Different Metric Combinations**
   ```bash
   # Try: Email Opened → Link Clicked
   # Try: Product Viewed → Added to Cart
   # Try: Any metric → Any other metric
   # Verify all work correctly
   ```

4. **Test Error Handling**
   ```bash
   # Try without Klaviyo API key configured
   # Verify error message displays
   # Try with invalid metric selection
   # Verify validation works
   ```

### API Testing

```bash
# Test metrics endpoint
curl -X GET http://localhost:3000/api/metrics \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Test analysis creation
curl -X POST http://localhost:3000/api/analysis \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "name": "Test Analysis",
    "startMetricId": "UfyMVA",
    "conversionMetricId": "UhZHSf",
    "cohortPeriod": "week"
  }'
```

---

## 🔄 Backward Compatibility

### Existing Analyses
- Old analyses continue to work (stored in params)
- Can view historical results
- Can export old data
- No migration required

### Deprecated Methods
```typescript
// Still work but marked as deprecated
klaviyoService.getSubscriptionEvents()
klaviyoService.getOrderEvents()

// Recommended replacement
klaviyoService.getAllEvents(metricId)
```

---

## 📈 Future Enhancements

### Potential Additions

1. **Metric Search/Filter**
   - Search box to filter metrics by name
   - Category filtering (e.g., "email", "ecommerce", "custom")

2. **Saved Configurations**
   - Save favorite metric combinations
   - Quick-start templates

3. **Multiple Conversion Metrics**
   - Track multiple conversions from single start metric
   - Compare conversion rates across different goals

4. **Advanced Filtering**
   - Filter events by list/segment
   - Date range selection
   - Profile property filters

5. **Real-time Preview**
   - Show sample data before running full analysis
   - Estimated completion time
   - Event count preview

6. **Custom Metric Groups**
   - Group related metrics together
   - Create virtual metrics (combined events)

---

## 🐛 Known Limitations

1. **Metric Names:** Uses Klaviyo's exact metric names (no aliasing)
2. **Event Volume:** Large analyses (>100K events) may take 2-3 minutes
3. **Caching:** Metrics cache is instance-specific (not shared across containers)
4. **Validation:** Doesn't validate if selected metrics make logical sense together

---

## 📝 Files Changed

```
frontend/src/app/(dashboard)/analysis/new/page.tsx  (+96 -23)
  - Added metric dropdown UI
  - Added loading states
  - Updated copy for flexibility

frontend/src/app/api/analysis/route.ts  (+15 -5)
  - Added startMetricId/conversionMetricId validation
  - Updated background runner to use dynamic metrics

frontend/src/app/api/metrics/route.ts  (new file)
  - New endpoint to fetch Klaviyo metrics
  - Authentication and caching

frontend/src/services/analysis.service.ts  (+35 -12)
  - Added cohortPeriod parameter support
  - Support for day/week/month grouping
  - Generic event processing

frontend/src/services/klaviyo.service.ts  (+15 -2)
  - Added getAllEvents() method
  - Deprecated old metric-specific methods
```

---

## ✅ Checklist

- [x] Metric selection UI implemented
- [x] Metrics API endpoint created
- [x] Analysis API updated to accept metric IDs
- [x] Background processing updated
- [x] Services updated for flexibility
- [x] Cohort period support added (day/week/month)
- [x] Error handling implemented
- [x] Loading states added
- [x] Backward compatibility maintained
- [x] Code committed and pushed
- [x] Documentation created

---

## 🎉 Result

The Klaviyo Analysis tool is now a **flexible, general-purpose cohort analysis platform** that can analyze the time-to-conversion between ANY two metrics in a Klaviyo account, making it useful for:

- Marketing teams analyzing various funnels
- E-commerce teams tracking product engagement
- SaaS companies monitoring onboarding
- Event organizers measuring registration-to-attendance
- Content marketers tracking engagement paths

**The tool is now 10x more valuable than before!** 🚀

