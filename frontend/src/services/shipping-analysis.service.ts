import { KlaviyoEvent } from '@/types'

/**
 * Shipping Analysis Service
 * Handles business logic for shipping speed impact on repeat purchase analysis
 */

export interface OrderEvent {
  eventId: string
  orderId: string
  orderNumber: number
  datetime: Date
  profileId: string
  email: string
  shippingRate: string
  value: number
  itemCount: number
  items: string[]
  eventProperties: any
}

export interface DeliveryEvent {
  eventId: string
  orderId: string
  orderNumber: string
  datetime: Date
  deliveredAt: Date
  orderCreatedDate: Date
  fulfillmentCreatedDate: Date
  businessDaysSinceFulfillment: number
  serviceLevelFriendlyName: string
  carrierName: string
  trackingCode: string
  eventProperties: any
}

export interface ProfileTimeline {
  profileId: string
  email: string

  firstOrder: {
    date: Date
    orderId: string
    orderNumber: number
    shippingRate: string
    value: number
    deliveredDate: Date | null
    deliveryDurationDays: number | null
    businessDaysToDelivery: number | null
  }

  secondOrder: {
    date: Date
    orderId: string
    orderNumber: number
    daysSinceFirst: number
    value: number
  } | null

  cohortPeriod: string
  shippingRateGroup: string
  totalLifetimeOrders: number
  hasDeliveryData: boolean
}

export interface CohortCell {
  cohortPeriod: string
  shippingRate: string
  deliveryQuartile: string

  totalCustomers: number
  customersWithDelivery: number
  avgDeliveryDays: number | null

  customersWithRepeat: number
  repeatRate30d: number
  repeatRate60d: number
  repeatRate90d: number

  medianDaysToRepeat: number | null
  avgDaysToRepeat: number | null

  repeatDistribution: {
    day_0_7: number
    day_8_14: number
    day_15_30: number
    day_31_60: number
    day_61_90: number
    day_91_plus: number
  }
}

export interface QuartileThresholds {
  q1: number // 25th percentile
  q2: number // 50th percentile (median)
  q3: number // 75th percentile
}

export class ShippingAnalysisService {
  /**
   * Parse Placed Order events into structured OrderEvent objects
   */
  parseOrderEvents(events: KlaviyoEvent[]): OrderEvent[] {
    return events.map((event) => {
      const attrs = event.attributes
      const props = attrs.event_properties || {}
      const extra = props.$extra || {}

      return {
        eventId: props.$event_id || event.id,
        orderId: props.$event_id || event.id,
        orderNumber: extra.order_number || 0,
        datetime: new Date(attrs.datetime),
        profileId: (event as any).relationships?.profile?.data?.id || '',
        email: extra.customer?.email || '',
        shippingRate: props.ShippingRate || 'Unknown',
        value: props.$value || 0,
        itemCount: props['Item Count'] || 0,
        items: props.Items || [],
        eventProperties: props,
      }
    })
  }

  /**
   * Parse Shipment Delivered events into structured DeliveryEvent objects
   */
  parseDeliveryEvents(events: KlaviyoEvent[]): DeliveryEvent[] {
    return events.map((event) => {
      const attrs = event.attributes
      const props = attrs.event_properties || {}

      return {
        eventId: event.id,
        orderId: props.OrderID || '',
        orderNumber: props.OrderNumber || '',
        datetime: new Date(attrs.datetime),
        deliveredAt: new Date(props.EventDate || attrs.datetime),
        orderCreatedDate: new Date(props.OrderCreatedDate || attrs.datetime),
        fulfillmentCreatedDate: new Date(
          props.FulfillmentCreatedDate || attrs.datetime
        ),
        businessDaysSinceFulfillment:
          props.BusinessDaysSinceFulfillmentCreated || 0,
        serviceLevelFriendlyName: props.ServiceLevelFriendlyName || 'Unknown',
        carrierName: props.CarrierName || '',
        trackingCode: props.TrackingCode || '',
        eventProperties: props,
      }
    })
  }

  /**
   * Link orders to their corresponding delivery events
   */
  linkOrdersToDeliveries(
    orders: OrderEvent[],
    deliveries: DeliveryEvent[]
  ): Map<string, DeliveryEvent> {
    const deliveryMap = new Map<string, DeliveryEvent>()

    for (const delivery of deliveries) {
      if (delivery.orderId) {
        deliveryMap.set(delivery.orderId, delivery)
      }
    }

    console.log(
      `Linked ${deliveryMap.size} deliveries out of ${orders.length} orders`
    )
    return deliveryMap
  }

  /**
   * Build profile timelines from orders
   * Only includes profiles whose LIFETIME first order is in the analysis window
   */
  buildProfileTimelines(
    ordersInWindow: OrderEvent[],
    allOrdersByProfile: Map<string, OrderEvent[]>,
    deliveryMap: Map<string, DeliveryEvent>,
    startDate: Date,
    endDate: Date,
    cohortPeriod: 'day' | 'week' | 'month'
  ): ProfileTimeline[] {
    const timelines: ProfileTimeline[] = []

    // Get unique profile IDs from orders in window
    const profileIds = new Set(ordersInWindow.map((o) => o.profileId))

    for (const profileId of profileIds) {
      // Get ALL orders for this profile (lifetime)
      const allOrders = allOrdersByProfile.get(profileId) || []
      if (allOrders.length === 0) continue

      // Sort chronologically
      const sortedOrders = allOrders.sort(
        (a, b) => a.datetime.getTime() - b.datetime.getTime()
      )

      // Get LIFETIME first order
      const firstOrder = sortedOrders[0]

      // ⭐ CRITICAL: Only include if lifetime first order is in analysis window
      if (
        firstOrder.datetime < startDate ||
        firstOrder.datetime > endDate
      ) {
        continue
      }

      // Get second order (if exists)
      const secondOrder = sortedOrders[1] || null

      // Find delivery for first order
      const delivery = deliveryMap.get(firstOrder.orderId)

      // Calculate delivery duration
      let deliveryDurationDays: number | null = null
      let businessDaysToDelivery: number | null = null

      if (delivery) {
        const durationMs =
          delivery.deliveredAt.getTime() - firstOrder.datetime.getTime()
        deliveryDurationDays = Math.round(durationMs / (1000 * 60 * 60 * 24))
        businessDaysToDelivery = delivery.businessDaysSinceFulfillment
      }

      // Build timeline
      timelines.push({
        profileId,
        email: firstOrder.email,

        firstOrder: {
          date: firstOrder.datetime,
          orderId: firstOrder.orderId,
          orderNumber: firstOrder.orderNumber,
          shippingRate: firstOrder.shippingRate,
          value: firstOrder.value,
          deliveredDate: delivery?.deliveredAt || null,
          deliveryDurationDays,
          businessDaysToDelivery,
        },

        secondOrder: secondOrder
          ? {
              date: secondOrder.datetime,
              orderId: secondOrder.orderId,
              orderNumber: secondOrder.orderNumber,
              daysSinceFirst: Math.round(
                (secondOrder.datetime.getTime() - firstOrder.datetime.getTime()) /
                  (1000 * 60 * 60 * 24)
              ),
              value: secondOrder.value,
            }
          : null,

        cohortPeriod: this.getCohortPeriod(firstOrder.datetime, cohortPeriod),
        shippingRateGroup: firstOrder.shippingRate, // No normalization - use exact string
        totalLifetimeOrders: sortedOrders.length,
        hasDeliveryData: delivery !== undefined,
      })
    }

    console.log(
      `Built ${timelines.length} profile timelines (lifetime first orders in window)`
    )
    return timelines
  }

  /**
   * Calculate quartile thresholds for delivery duration, per shipping rate
   */
  calculateDeliveryQuartiles(
    timelines: ProfileTimeline[]
  ): Map<string, QuartileThresholds> {
    const quartileMap = new Map<string, QuartileThresholds>()

    // Group by shipping rate
    const byShippingRate = new Map<string, ProfileTimeline[]>()
    for (const timeline of timelines) {
      const rate = timeline.shippingRateGroup
      if (!byShippingRate.has(rate)) {
        byShippingRate.set(rate, [])
      }
      byShippingRate.get(rate)!.push(timeline)
    }

    // Calculate quartiles for each shipping rate
    for (const [shippingRate, profiles] of byShippingRate) {
      // Get delivery durations (exclude null)
      const durations = profiles
        .map((p) => p.firstOrder.deliveryDurationDays)
        .filter((d): d is number => d !== null)
        .sort((a, b) => a - b)

      if (durations.length >= 4) {
        quartileMap.set(shippingRate, {
          q1: this.percentile(durations, 25),
          q2: this.percentile(durations, 50),
          q3: this.percentile(durations, 75),
        })
      }
    }

    return quartileMap
  }

  /**
   * Assign delivery quartile to each timeline
   */
  assignDeliveryQuartiles(
    timelines: ProfileTimeline[],
    quartileMap: Map<string, QuartileThresholds>
  ): (ProfileTimeline & { deliveryQuartile: string })[] {
    return timelines.map((timeline) => {
      const quartiles = quartileMap.get(timeline.shippingRateGroup)
      const duration = timeline.firstOrder.deliveryDurationDays

      let deliveryQuartile = 'unknown'

      if (duration !== null && quartiles) {
        if (duration <= quartiles.q1) {
          deliveryQuartile = 'Q1_fastest'
        } else if (duration <= quartiles.q2) {
          deliveryQuartile = 'Q2_fast'
        } else if (duration <= quartiles.q3) {
          deliveryQuartile = 'Q3_slow'
        } else {
          deliveryQuartile = 'Q4_slowest'
        }
      }

      return {
        ...timeline,
        deliveryQuartile,
      }
    })
  }

  /**
   * Aggregate timelines into cohort cells
   */
  aggregateCohorts(
    timelines: (ProfileTimeline & { deliveryQuartile: string })[]
  ): CohortCell[] {
    const cohortCells = new Map<string, ProfileTimeline[]>()

    // Group by: cohort_period × shipping_rate × delivery_quartile
    for (const timeline of timelines) {
      const key = `${timeline.cohortPeriod}|${timeline.shippingRateGroup}|${timeline.deliveryQuartile}`

      if (!cohortCells.has(key)) {
        cohortCells.set(key, [])
      }
      cohortCells.get(key)!.push(timeline)
    }

    // Calculate metrics for each cell
    const results: CohortCell[] = []

    for (const [key, profiles] of cohortCells) {
      const [cohortPeriod, shippingRate, deliveryQuartile] = key.split('|')

      const profilesWithDelivery = profiles.filter((p) => p.hasDeliveryData)
      const profilesWithRepeat = profiles.filter((p) => p.secondOrder !== null)

      const daysToRepeat = profilesWithRepeat.map(
        (p) => p.secondOrder!.daysSinceFirst
      )

      const deliveryDurations = profilesWithDelivery
        .map((p) => p.firstOrder.deliveryDurationDays)
        .filter((d): d is number => d !== null)

      results.push({
        cohortPeriod,
        shippingRate,
        deliveryQuartile,

        totalCustomers: profiles.length,
        customersWithDelivery: profilesWithDelivery.length,
        avgDeliveryDays:
          deliveryDurations.length > 0
            ? this.average(deliveryDurations)
            : null,

        customersWithRepeat: profilesWithRepeat.length,
        repeatRate30d:
          profilesWithRepeat.filter((p) => p.secondOrder!.daysSinceFirst <= 30)
            .length / profiles.length,
        repeatRate60d:
          profilesWithRepeat.filter((p) => p.secondOrder!.daysSinceFirst <= 60)
            .length / profiles.length,
        repeatRate90d:
          profilesWithRepeat.filter((p) => p.secondOrder!.daysSinceFirst <= 90)
            .length / profiles.length,

        medianDaysToRepeat:
          daysToRepeat.length > 0 ? this.median(daysToRepeat) : null,
        avgDaysToRepeat:
          daysToRepeat.length > 0 ? this.average(daysToRepeat) : null,

        repeatDistribution: {
          day_0_7: daysToRepeat.filter((d) => d <= 7).length,
          day_8_14: daysToRepeat.filter((d) => d > 7 && d <= 14).length,
          day_15_30: daysToRepeat.filter((d) => d > 14 && d <= 30).length,
          day_31_60: daysToRepeat.filter((d) => d > 30 && d <= 60).length,
          day_61_90: daysToRepeat.filter((d) => d > 60 && d <= 90).length,
          day_91_plus: daysToRepeat.filter((d) => d > 90).length,
        },
      })
    }

    return results
  }

  /**
   * Get cohort period string from date
   */
  private getCohortPeriod(
    date: Date,
    period: 'day' | 'week' | 'month'
  ): string {
    const year = date.getFullYear()

    switch (period) {
      case 'day':
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`

      case 'week':
        const weekNum = this.getWeekNumber(date)
        return `${year}-W${String(weekNum).padStart(2, '0')}`

      case 'month':
        const monthNum = String(date.getMonth() + 1).padStart(2, '0')
        return `${year}-${monthNum}`

      default:
        return `${year}-W${String(this.getWeekNumber(date)).padStart(2, '0')}`
    }
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
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }

  /**
   * Calculate percentile
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const index = (p / 100) * (sorted.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1

    if (lower === upper) {
      return sorted[lower]
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  }

  /**
   * Calculate median
   */
  private median(arr: number[]): number {
    return this.percentile(arr, 50)
  }

  /**
   * Calculate average
   */
  private average(arr: number[]): number {
    if (arr.length === 0) return 0
    return arr.reduce((sum, val) => sum + val, 0) / arr.length
  }
}

export const shippingAnalysisService = new ShippingAnalysisService()

