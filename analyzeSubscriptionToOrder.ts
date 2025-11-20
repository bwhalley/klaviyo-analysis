/**
 * Analyzes time from email subscription to first order for Klaviyo profiles
 * 
 * This script:
 * 1. Finds all profiles who subscribed to a list
 * 2. Finds their first "Placed Order" event
 * 3. Calculates time differences
 * 4. Computes median and mean statistics
 * 5. Generates cohort data for visualization
 */

import Logger from '@wonderment/common-utils/dist/Logger'
import db from '@wonderment/common-server/dist/Database'

const logger = Logger('analyzeSubscriptionToOrder')

interface ProfileEventData {
  profileID: string
  subscribedDate: Date
  firstOrderDate: Date | null
  daysToFirstOrder: number | null
}

interface CohortData {
  signupDate: string // YYYY-MM-DD
  cohort: string // e.g., "Week of 2024-01-01"
  subscribers: number
  ordersPlaced: number
  conversionRate: number
  avgDaysToOrder: number
  medianDaysToOrder: number
  distribution: {
    [dayRange: string]: number // e.g., "0-7 days": 50
  }
}

interface Statistics {
  totalSubscribers: number
  subscribersWithOrder: number
  conversionRate: number
  meanDaysToFirstOrder: number
  medianDaysToFirstOrder: number
  stdDev: number
}

/**
 * Main analysis function
 * 
 * NOTE: This uses the Klaviyo MCP server functions. To use this:
 * 1. Get the metrics IDs for "Subscribed to List" and "Placed Order"
 * 2. Use mcp_klaviyo_klaviyo_get_events to fetch events filtered by metric
 * 3. Process the data as shown below
 */
export async function analyzeSubscriptionToOrder(
  shopID?: number,
  startDate?: string,
  endDate?: string
): Promise<{
  statistics: Statistics
  cohortData: CohortData[]
  profileData: ProfileEventData[]
}> {
  logger.info('[analyzeSubscriptionToOrder] Starting analysis', {
    shopID,
    startDate,
    endDate,
  })

  // Step 1: Get metric IDs
  // You would use: mcp_klaviyo_klaviyo_get_metrics to find "Subscribed to List" and "Placed Order"
  
  // Step 2: Get events for both metrics
  // For "Subscribed to List": mcp_klaviyo_klaviyo_get_events with filters
  // For "Placed Order": mcp_klaviyo_klaviyo_get_events with filters
  
  // Since we can't directly call MCP functions here, this is a template
  // showing the data processing logic

  // Simulated data structure (replace with actual MCP function calls)
  const profileEventData: ProfileEventData[] = []
  
  // This is the pattern you'd follow:
  // 1. Get "Subscribed to List" events
  // 2. Get "Placed Order" events  
  // 3. Group by profile ID
  // 4. Match subscription to first order
  // 5. Calculate time differences

  const statistics = calculateStatistics(profileEventData)
  const cohortData = generateCohortData(profileEventData)

  return {
    statistics,
    cohortData,
    profileData: profileEventData,
  }
}

function calculateStatistics(
  data: ProfileEventData[]
): Statistics {
  const subscribersWithOrder = data.filter(
    (d) => d.firstOrderDate !== null
  )
  const daysToOrder = subscribersWithOrder
    .map((d) => d.daysToFirstOrder!)
    .filter((days) => days !== null && days >= 0)

  if (daysToOrder.length === 0) {
    return {
      totalSubscribers: data.length,
      subscribersWithOrder: 0,
      conversionRate: 0,
      meanDaysToFirstOrder: 0,
      medianDaysToFirstOrder: 0,
      stdDev: 0,
    }
  }

  // Calculate mean
  const mean =
    daysToOrder.reduce((sum, days) => sum + days, 0) / daysToOrder.length

  // Calculate median
  const sorted = [...daysToOrder].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]

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
  }
}

function generateCohortData(
  data: ProfileEventData[],
  cohortPeriod: 'day' | 'week' | 'month' = 'week'
): CohortData[] {
  // Group subscriptions by cohort period
  const cohorts = new Map<string, ProfileEventData[]>()

  data.forEach((profile) => {
    const signupDate = new Date(profile.subscribedDate)
    let cohortKey: string
    let signupDateStr: string

    if (cohortPeriod === 'week') {
      // Get the Monday of the week
      const dayOfWeek = signupDate.getDay()
      const diff = signupDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const monday = new Date(signupDate.setDate(diff))
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
  const cohortData: CohortData[] = []

  cohorts.forEach((profiles, cohortKey) => {
    const subscribersWithOrder = profiles.filter(
      (p) => p.firstOrderDate !== null
    )
    const daysToOrder = subscribersWithOrder.map((p) => p.daysToFirstOrder!)

    // Calculate distribution by day ranges
    const distribution: { [key: string]: number } = {
      '0-7 days': 0,
      '8-14 days': 0,
      '15-30 days': 0,
      '31-60 days': 0,
      '61-90 days': 0,
      '91+ days': 0,
    }

    daysToOrder.forEach((days) => {
      if (days <= 7) distribution['0-7 days']++
      else if (days <= 14) distribution['8-14 days']++
      else if (days <= 30) distribution['15-30 days']++
      else if (days <= 60) distribution['31-60 days']++
      else if (days <= 90) distribution['61-90 days']++
      else distribution['91+ days']++
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
      cohort: cohortKey,
      subscribers: profiles.length,
      ordersPlaced: subscribersWithOrder.length,
      conversionRate:
        profiles.length > 0
          ? subscribersWithOrder.length / profiles.length
          : 0,
      avgDaysToOrder: avgDays,
      medianDaysToOrder: median,
      distribution,
    })
  })

  // Sort by signup date
  return cohortData.sort(
    (a, b) =>
      new Date(a.signupDate).getTime() - new Date(b.signupDate).getTime()
  )
}

/**
 * Example usage with Klaviyo MCP functions:
 * 
 * async function fetchDataUsingMCP(shopID: number) {
 *   // 1. Get metrics to find IDs
 *   const metrics = await mcp_klaviyo_klaviyo_get_metrics({
 *     model: "claude",
 *     fields: ["name"]
 *   })
 *   
 *   const subscribedMetric = metrics.data.find(m => m.name === "Subscribed to List")
 *   const placedOrderMetric = metrics.data.find(m => m.name === "Placed Order")
 *   
 *   // 2. Get subscription events
 *   const subscriptionEvents = await mcp_klaviyo_klaviyo_get_events({
 *     model: "claude",
 *     events_fields: ["datetime", "timestamp"],
 *     filters: [{
 *       field: "metric_id",
 *       operator: "equals",
 *       value: subscribedMetric.id
 *     }],
 *     sort: "datetime"
 *   })
 *   
 *   // 3. Get placed order events
 *   const orderEvents = await mcp_klaviyo_klaviyo_get_events({
 *     model: "claude",
 *     events_fields: ["datetime", "timestamp"],
 *     filters: [{
 *       field: "metric_id",
 *       operator: "equals",
 *       value: placedOrderMetric.id
 *     }],
 *     sort: "datetime"
 *   })
 *   
 *   // 4. Process events to match by profile
 *   // Group by profile_id, find first subscription and first order
 *   // Calculate time differences
 *   
 *   return processedData
 * }
 */

if (require.main === module) {
  analyzeSubscriptionToOrder()
    .then((results) => {
      console.log('Statistics:', JSON.stringify(results.statistics, null, 2))
      console.log('\nCohort Data:', JSON.stringify(results.cohortData, null, 2))
      process.exit(0)
    })
    .catch((error) => {
      logger.error('[analyzeSubscriptionToOrder] Error', { error })
      process.exit(1)
    })
}

