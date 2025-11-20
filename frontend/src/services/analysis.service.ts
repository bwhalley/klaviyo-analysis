/**
 * Analysis Service - Port of src/runSubscriptionToOrderAnalysis.ts
 * Core logic for analyzing subscription-to-order conversion
 */

import { ProfileData, Statistics, CohortDataPoint } from '@/types'

export class AnalysisService {
  /**
   * Process subscription events - get first subscription per profile
   */
  processSubscriptionEvents(events: any[]): Map<string, Date> {
    const subscriptions = new Map<string, Date>()

    for (const event of events) {
      const profileID = event.relationships?.profile?.data?.id
      if (!profileID) continue

      const datetime = event.attributes?.datetime
      if (!datetime) continue

      const subscriptionDate = new Date(datetime)

      // Keep only the earliest subscription per profile
      const existing = subscriptions.get(profileID)
      if (!existing || subscriptionDate < existing) {
        subscriptions.set(profileID, subscriptionDate)
      }
    }

    return subscriptions
  }

  /**
   * Process order events - get first order per profile
   */
  processOrderEvents(events: any[]): Map<string, Date> {
    const orders = new Map<string, Date>()

    for (const event of events) {
      const profileID = event.relationships?.profile?.data?.id
      if (!profileID) continue

      const datetime = event.attributes?.datetime
      if (!datetime) continue

      const orderDate = new Date(datetime)

      // Keep only the earliest order per profile
      const existing = orders.get(profileID)
      if (!existing || orderDate < existing) {
        orders.set(profileID, orderDate)
      }
    }

    return orders
  }

  /**
   * Match subscriptions to orders and calculate time differences
   */
  matchSubscriptionsToOrders(
    subscriptions: Map<string, Date>,
    orders: Map<string, Date>
  ): ProfileData[] {
    const profiles: ProfileData[] = []

    for (const [profileID, subscriptionDate] of subscriptions.entries()) {
      const orderDate = orders.get(profileID) || null

      let daysToFirstOrder: number | null = null
      if (orderDate && orderDate > subscriptionDate) {
        const diffMs = orderDate.getTime() - subscriptionDate.getTime()
        daysToFirstOrder = Math.round(diffMs / (1000 * 60 * 60 * 24))
      }

      profiles.push({
        profileID,
        firstSubscriptionDate: subscriptionDate,
        firstOrderDate: orderDate,
        daysToFirstOrder,
      })
    }

    return profiles
  }

  /**
   * Calculate statistics
   */
  calculateStatistics(profiles: ProfileData[]): Statistics {
    const withOrders = profiles.filter((p) => p.daysToFirstOrder !== null)
    const daysToOrder = withOrders
      .map((p) => p.daysToFirstOrder!)
      .filter((d) => d >= 0) // Only include orders after subscription
      .sort((a, b) => a - b)

    const mean =
      daysToOrder.length > 0
        ? daysToOrder.reduce((sum, d) => sum + d, 0) / daysToOrder.length
        : 0

    const median =
      daysToOrder.length > 0
        ? daysToOrder[Math.floor(daysToOrder.length / 2)]
        : 0

    // Standard deviation
    const variance =
      daysToOrder.length > 0
        ? daysToOrder.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
          daysToOrder.length
        : 0
    const stdDev = Math.sqrt(variance)

    // Percentiles
    const p25 = daysToOrder[Math.floor(daysToOrder.length * 0.25)] || 0
    const p75 = daysToOrder[Math.floor(daysToOrder.length * 0.75)] || 0
    const p90 = daysToOrder[Math.floor(daysToOrder.length * 0.9)] || 0
    const p95 = daysToOrder[Math.floor(daysToOrder.length * 0.95)] || 0

    return {
      totalSubscribers: profiles.length,
      subscribersWithOrder: withOrders.length,
      conversionRate:
        profiles.length > 0
          ? (withOrders.length / profiles.length) * 100
          : 0,
      meanDaysToFirstOrder: mean,
      medianDaysToFirstOrder: median,
      stdDev,
      percentiles: { p25, p75, p90, p95 },
    }
  }

  /**
   * Generate cohort data
   */
  generateCohortData(profiles: ProfileData[]): CohortDataPoint[] {
    // Group by week of subscription
    const cohorts = new Map<string, ProfileData[]>()

    for (const profile of profiles) {
      const date = profile.firstSubscriptionDate
      const year = date.getFullYear()
      const week = this.getWeekNumber(date)
      const cohortKey = `${year}-W${week.toString().padStart(2, '0')}`

      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, [])
      }
      cohorts.get(cohortKey)!.push(profile)
    }

    const cohortData: CohortDataPoint[] = []

    for (const [_, cohortProfiles] of cohorts.entries()) {
      const withOrders = cohortProfiles.filter(
        (p) => p.daysToFirstOrder !== null && p.daysToFirstOrder! >= 0
      )
      const daysToOrder = withOrders
        .map((p) => p.daysToFirstOrder!)
        .sort((a, b) => a - b)

      const avgDays =
        daysToOrder.length > 0
          ? daysToOrder.reduce((sum, d) => sum + d, 0) / daysToOrder.length
          : 0

      const medianDays =
        daysToOrder.length > 0
          ? daysToOrder[Math.floor(daysToOrder.length / 2)]
          : 0

      const firstProfile = cohortProfiles[0]
      cohortData.push({
        signupDate: firstProfile.firstSubscriptionDate
          .toISOString()
          .split('T')[0],
        cohortLabel: `Week of ${firstProfile.firstSubscriptionDate.toISOString().split('T')[0]}`,
        subscribers: cohortProfiles.length,
        ordersPlaced: withOrders.length,
        conversionRate:
          cohortProfiles.length > 0
            ? (withOrders.length / cohortProfiles.length) * 100
            : 0,
        avgDaysToOrder: avgDays,
        medianDaysToOrder: medianDays,
      })
    }

    // Sort by signup date
    cohortData.sort((a, b) => a.signupDate.localeCompare(b.signupDate))

    return cohortData
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    )
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((d.getTime() - yearStart.getTime()) / 86400000 + 1 / 7)
  }

  /**
   * Main analysis function
   */
  async runAnalysis(
    subscriptionEvents: any[],
    orderEvents: any[]
  ): Promise<{
    statistics: Statistics
    cohortData: CohortDataPoint[]
    profiles: ProfileData[]
  }> {
    console.log(`Processing ${subscriptionEvents.length} subscription events...`)
    const subscriptions = this.processSubscriptionEvents(subscriptionEvents)
    console.log(`Found ${subscriptions.size} unique subscribers`)

    console.log(`Processing ${orderEvents.length} order events...`)
    const orders = this.processOrderEvents(orderEvents)
    console.log(`Found ${orders.size} unique profiles with orders`)

    console.log('Matching subscriptions to orders...')
    const profiles = this.matchSubscriptionsToOrders(subscriptions, orders)

    console.log('Calculating statistics...')
    const statistics = this.calculateStatistics(profiles)

    console.log('Generating cohort data...')
    const cohortData = this.generateCohortData(profiles)

    return {
      statistics,
      cohortData,
      profiles,
    }
  }
}

// Export singleton instance
export const analysisService = new AnalysisService()

