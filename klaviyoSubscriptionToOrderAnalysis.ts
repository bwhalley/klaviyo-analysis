/**
 * Complete implementation for analyzing time from email subscription to first order
 * 
 * This script demonstrates:
 * 1. How to use Klaviyo MCP functions to fetch events
 * 2. Matching subscribers to their first order
 * 3. Calculating median and mean statistics
 * 4. Generating cohort chart data
 * 
 * USAGE:
 * This script would need to be adapted to work in an environment where
 * the Klaviyo MCP server functions are available (e.g., through the MCP protocol)
 */

interface KlaviyoEvent {
  uuid?: string
  timestamp?: number
  datetime?: string
  event_properties?: any
  profile_id?: string
}

interface KlaviyoMetric {
  id: string
  name: string
}

interface ProfileSubscriptionData {
  profileID: string
  subscribedDate: Date
  firstOrderDate: Date | null
  daysToFirstOrder: number | null
}

interface AnalysisResult {
  statistics: {
    totalSubscribers: number
    subscribersWithOrder: number
    conversionRate: number
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
  cohortData: CohortDataPoint[]
  distribution: DayRangeDistribution
}

interface CohortDataPoint {
  signupDate: string // YYYY-MM-DD
  cohortLabel: string // e.g., "Week of 2024-01-01"
  subscribers: number
  ordersPlaced: number
  conversionRate: number
  avgDaysToOrder: number
  medianDaysToOrder: number
  dayRanges: {
    '0-7 days': number
    '8-14 days': number
    '15-30 days': number
    '31-60 days': number
    '61-90 days': number
    '91+ days': number
  }
}

interface DayRangeDistribution {
  '0-7 days': number
  '8-14 days': number
  '15-30 days': number
  '31-60 days': number
  '61-90 days': number
  '91+ days': number
  never: number // subscribers who never placed an order
}

/**
 * Main analysis function
 * 
 * STEP-BY-STEP APPROACH:
 * 
 * 1. Get metric IDs:
 *    - Use mcp_klaviyo_klaviyo_get_metrics() to find "Subscribed to List" and "Placed Order"
 * 
 * 2. Get subscription events:
 *    - Use mcp_klaviyo_klaviyo_get_events() with filter: metric_id = subscribedMetricId
 *    - For each event, extract profile_id and datetime
 *    - Group by profile_id, keep only the first subscription per profile
 * 
 * 3. Get placed order events:
 *    - Use mcp_klaviyo_klaviyo_get_events() with filter: metric_id = placedOrderMetricId
 *    - For each event, extract profile_id and datetime
 *    - Group by profile_id, keep only the first order per profile
 * 
 * 4. Match subscriptions to orders:
 *    - For each subscriber, find their first order (if any)
 *    - Calculate time difference in days
 * 
 * 5. Calculate statistics:
 *    - Mean, median, percentiles, standard deviation
 * 
 * 6. Generate cohort data:
 *    - Group subscribers by signup week/month
 *    - Calculate conversion rates and time-to-order per cohort
 *    - Create distribution buckets
 */
export async function analyzeSubscriptionToOrderTime(
  startDate?: string,
  endDate?: string
): Promise<AnalysisResult> {
  // NOTE: This is pseudocode showing the structure
  // In practice, you would call the MCP functions here

  // STEP 1: Get metrics
  // const metrics = await mcp_klaviyo_klaviyo_get_metrics({
  //   model: "claude",
  //   fields: ["name"]
  // })
  // const subscribedMetric = metrics.find(m => m.name === "Subscribed to List")
  // const placedOrderMetric = metrics.find(m => m.name === "Placed Order")

  // STEP 2: Get subscription events
  // const subscriptionEvents = await mcp_klaviyo_klaviyo_get_events({
  //   model: "claude",
  //   events_fields: ["timestamp", "datetime", "event_properties"],
  //   filters: [
  //     {
  //       field: "metric_id",
  //       operator: "equals",
  //       value: subscribedMetric.id
  //     },
  //     // Add date filters if needed
  //     ...(startDate ? [{
  //       field: "datetime",
  //       operator: "greater-or-equal",
  //       value: startDate
  //     }] : []),
  //     ...(endDate ? [{
  //       field: "datetime",
  //       operator: "less-or-equal",
  //       value: endDate
  //     }] : [])
  //   ],
  //   sort: "datetime"
  // })

  // STEP 3: Get placed order events
  // const orderEvents = await mcp_klaviyo_klaviyo_get_events({
  //   model: "claude",
  //   events_fields: ["timestamp", "datetime", "event_properties"],
  //   filters: [
  //     {
  //       field: "metric_id",
  //       operator: "equals",
  //       value: placedOrderMetric.id
  //     }
  //   ],
  //   sort: "datetime"
  // })

  // STEP 4: Process the data
  // const profileData = processEvents(subscriptionEvents, orderEvents)

  // Placeholder for demonstration
  const profileData: ProfileSubscriptionData[] = []

  // STEP 5: Calculate statistics
  const statistics = calculateStatistics(profileData)

  // STEP 6: Generate cohort data
  const cohortData = generateCohortData(profileData)
  const distribution = calculateDistribution(profileData)

  return {
    statistics,
    cohortData,
    distribution,
  }
}

/**
 * Process events to match subscriptions with orders
 */
function processEvents(
  subscriptionEvents: KlaviyoEvent[],
  orderEvents: KlaviyoEvent[]
): ProfileSubscriptionData[] {
  // Group subscriptions by profile, keep only first
  const subscriptionsByProfile = new Map<string, Date>()
  
  subscriptionEvents.forEach((event) => {
    const profileID = event.profile_id
    if (!profileID) return

    const eventDate = event.datetime
      ? new Date(event.datetime)
      : event.timestamp
      ? new Date(event.timestamp * 1000)
      : null

    if (!eventDate) return

    if (
      !subscriptionsByProfile.has(profileID) ||
      eventDate < subscriptionsByProfile.get(profileID)!
    ) {
      subscriptionsByProfile.set(profileID, eventDate)
    }
  })

  // Group orders by profile, keep only first
  const ordersByProfile = new Map<string, Date>()
  
  orderEvents.forEach((event) => {
    const profileID = event.profile_id
    if (!profileID) return

    const eventDate = event.datetime
      ? new Date(event.datetime)
      : event.timestamp
      ? new Date(event.timestamp * 1000)
      : null

    if (!eventDate) return

    if (
      !ordersByProfile.has(profileID) ||
      eventDate < ordersByProfile.get(profileID)!
    ) {
      ordersByProfile.set(profileID, eventDate)
    }
  })

  // Match subscriptions to orders
  const profileData: ProfileSubscriptionData[] = []

  subscriptionsByProfile.forEach((subscribedDate, profileID) => {
    const firstOrderDate = ordersByProfile.get(profileID) || null
    const daysToFirstOrder =
      firstOrderDate !== null
        ? Math.floor(
            (firstOrderDate.getTime() - subscribedDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null

    // Only include if subscription came before order (or no order)
    if (
      firstOrderDate === null ||
      firstOrderDate.getTime() >= subscribedDate.getTime()
    ) {
      profileData.push({
        profileID,
        subscribedDate,
        firstOrderDate,
        daysToFirstOrder,
      })
    }
  })

  return profileData
}

/**
 * Calculate statistical summary
 */
function calculateStatistics(
  data: ProfileSubscriptionData[]
): AnalysisResult['statistics'] {
  const subscribersWithOrder = data.filter(
    (d) => d.daysToFirstOrder !== null && d.daysToFirstOrder >= 0
  )
  const daysToOrder = subscribersWithOrder.map((d) => d.daysToFirstOrder!)

  if (daysToOrder.length === 0) {
    return {
      totalSubscribers: data.length,
      subscribersWithOrder: 0,
      conversionRate: 0,
      meanDaysToFirstOrder: 0,
      medianDaysToFirstOrder: 0,
      stdDev: 0,
      percentiles: {
        p25: 0,
        p75: 0,
        p90: 0,
        p95: 0,
      },
    }
  }

  // Calculate mean
  const mean =
    daysToOrder.reduce((sum, days) => sum + days, 0) / daysToOrder.length

  // Calculate median and percentiles
  const sorted = [...daysToOrder].sort((a, b) => a - b)
  const percentile = (p: number) => {
    const index = Math.floor(sorted.length * p)
    return sorted[index] || 0
  }

  const median = percentile(0.5)
  const p25 = percentile(0.25)
  const p75 = percentile(0.75)
  const p90 = percentile(0.9)
  const p95 = percentile(0.95)

  // Calculate standard deviation
  const variance =
    daysToOrder.reduce((sum, days) => sum + Math.pow(days - mean, 2), 0) /
    daysToOrder.length
  const stdDev = Math.sqrt(variance)

  return {
    totalSubscribers: data.length,
    subscribersWithOrder: subscribersWithOrder.length,
    conversionRate: subscribersWithOrder.length / data.length,
    meanDaysToFirstOrder: mean,
    medianDaysToFirstOrder: median,
    stdDev,
    percentiles: {
      p25,
      p75,
      p90,
      p95,
    },
  }
}

/**
 * Generate cohort data by signup period
 */
function generateCohortData(
  data: ProfileSubscriptionData[],
  cohortPeriod: 'day' | 'week' | 'month' = 'week'
): CohortDataPoint[] {
  // Group by cohort period
  const cohorts = new Map<string, ProfileSubscriptionData[]>()

  data.forEach((profile) => {
    const signupDate = profile.subscribedDate
    let cohortKey: string
    let signupDateStr: string

    if (cohortPeriod === 'week') {
      // Get the Monday of the week
      const dayOfWeek = signupDate.getDay()
      const diff =
        signupDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const monday = new Date(signupDate)
      monday.setDate(diff)
      cohortKey = `Week of ${monday.toISOString().split('T')[0]}`
      signupDateStr = monday.toISOString().split('T')[0]
    } else if (cohortPeriod === 'month') {
      cohortKey = `Month of ${signupDate.getFullYear()}-${String(
        signupDate.getMonth() + 1
      ).padStart(2, '0')}`
      const firstDay = new Date(
        signupDate.getFullYear(),
        signupDate.getMonth(),
        1
      )
      signupDateStr = firstDay.toISOString().split('T')[0]
    } else {
      // day
      cohortKey = signupDate.toISOString().split('T')[0]
      signupDateStr = cohortKey
    }

    if (!cohorts.has(cohortKey)) {
      cohorts.set(cohortKey, [])
    }
    cohorts.get(cohortKey)!.push(profile)
  })

  // Process each cohort
  const cohortData: CohortDataPoint[] = []

  cohorts.forEach((profiles, cohortKey) => {
    const subscribersWithOrder = profiles.filter(
      (p) => p.daysToFirstOrder !== null && p.daysToFirstOrder >= 0
    )
    const daysToOrder = subscribersWithOrder.map((p) => p.daysToFirstOrder!)

    // Calculate day range distribution
    const dayRanges = {
      '0-7 days': 0,
      '8-14 days': 0,
      '15-30 days': 0,
      '31-60 days': 0,
      '61-90 days': 0,
      '91+ days': 0,
    }

    daysToOrder.forEach((days) => {
      if (days <= 7) dayRanges['0-7 days']++
      else if (days <= 14) dayRanges['8-14 days']++
      else if (days <= 30) dayRanges['15-30 days']++
      else if (days <= 60) dayRanges['31-60 days']++
      else if (days <= 90) dayRanges['61-90 days']++
      else dayRanges['91+ days']++
    })

    const avgDays =
      daysToOrder.length > 0
        ? daysToOrder.reduce((sum, d) => sum + d, 0) / daysToOrder.length
        : 0

    const sorted = [...daysToOrder].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median =
      sorted.length > 0
        ? sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid]
        : 0

    cohortData.push({
      signupDate: profiles[0].subscribedDate.toISOString().split('T')[0],
      cohortLabel: cohortKey,
      subscribers: profiles.length,
      ordersPlaced: subscribersWithOrder.length,
      conversionRate:
        profiles.length > 0
          ? subscribersWithOrder.length / profiles.length
          : 0,
      avgDaysToOrder: avgDays,
      medianDaysToOrder: median,
      dayRanges,
    })
  })

  // Sort by signup date
  return cohortData.sort(
    (a, b) =>
      new Date(a.signupDate).getTime() - new Date(b.signupDate).getTime()
  )
}

/**
 * Calculate overall distribution
 */
function calculateDistribution(
  data: ProfileSubscriptionData[]
): DayRangeDistribution {
  const distribution: DayRangeDistribution = {
    '0-7 days': 0,
    '8-14 days': 0,
    '15-30 days': 0,
    '31-60 days': 0,
    '61-90 days': 0,
    '91+ days': 0,
    never: 0,
  }

  data.forEach((profile) => {
    if (profile.daysToFirstOrder === null) {
      distribution.never++
    } else {
      const days = profile.daysToFirstOrder
      if (days <= 7) distribution['0-7 days']++
      else if (days <= 14) distribution['8-14 days']++
      else if (days <= 30) distribution['15-30 days']++
      else if (days <= 60) distribution['31-60 days']++
      else if (days <= 90) distribution['61-90 days']++
      else distribution['91+ days']++
    }
  })

  return distribution
}

/**
 * Example output format for cohort chart visualization
 * 
 * The cohort data can be visualized as:
 * - X-axis: Cohort periods (weeks/months)
 * - Y-axis: Time to first order (days)
 * - Color/Size: Number of subscribers or conversion rate
 * 
 * Example React component structure:
 * 
 * interface CohortChartProps {
 *   data: CohortDataPoint[]
 * }
 * 
 * function CohortChart({ data }: CohortChartProps) {
 *   return (
 *     <ResponsiveContainer width="100%" height={600}>
 *       <BarChart data={data}>
 *         <XAxis dataKey="cohortLabel" />
 *         <YAxis label={{ value: 'Days to First Order', angle: -90 }} />
 *         <Tooltip />
 *         <Bar dataKey="avgDaysToOrder" fill="#8884d8" />
 *         <Bar dataKey="medianDaysToOrder" fill="#82ca9d" />
 *       </BarChart>
 *     </ResponsiveContainer>
 *   )
 * }
 */

export type { AnalysisResult, CohortDataPoint, ProfileSubscriptionData }

