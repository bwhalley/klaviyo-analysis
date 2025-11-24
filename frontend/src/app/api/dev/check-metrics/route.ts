import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { KlaviyoService } from '@/services/klaviyo.service'

/**
 * DEV ONLY: Check Klaviyo metrics and event structure
 * GET /api/dev/check-metrics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Klaviyo API key
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { klaviyoApiKeyEncrypted: true },
    })

    if (!user?.klaviyoApiKeyEncrypted) {
      return NextResponse.json(
        { error: 'Klaviyo API key not configured' },
        { status: 400 }
      )
    }

    const apiKey = decrypt(user.klaviyoApiKeyEncrypted)
    const klaviyoService = new KlaviyoService(apiKey)

    // Get all metrics
    const metricsResponse = await klaviyoService.getMetrics()
    const allMetrics = metricsResponse.data

    // Find target metrics
    const placedOrderMetric = allMetrics.find(
      (m) => m.attributes.name === 'Placed Order'
    )
    const deliveredMetric = allMetrics.find(
      (m) => m.attributes.name === 'Wonderment - Shipment Delivered'
    )

    const result: any = {
      totalMetrics: allMetrics.length,
      targetMetrics: {},
      sampleEvents: {},
    }

    // Get "Placed Order" details
    if (placedOrderMetric) {
      result.targetMetrics.placedOrder = {
        id: placedOrderMetric.id,
        name: placedOrderMetric.attributes.name,
        created: placedOrderMetric.attributes.created,
      }

      // Get sample events
      try {
        const orderEventsResponse = await klaviyoService.getEvents(
          placedOrderMetric.id,
          { pageCursor: null }
        )

        if (orderEventsResponse.data.length > 0) {
          const sampleEvent = orderEventsResponse.data[0]
          result.sampleEvents.placedOrder = {
            eventId: sampleEvent.id,
            timestamp: sampleEvent.attributes.timestamp,
            datetime: sampleEvent.attributes.datetime,
            eventProperties: sampleEvent.attributes.event_properties,
            availableProperties: Object.keys(
              sampleEvent.attributes.event_properties || {}
            ),
          }
        }
      } catch (error: any) {
        result.sampleEvents.placedOrder = { error: error.message }
      }
    } else {
      result.targetMetrics.placedOrder = {
        error: 'Metric "Placed Order" not found',
      }
    }

    // Get "Wonderment - Shipment Delivered" details
    if (deliveredMetric) {
      result.targetMetrics.shipmentDelivered = {
        id: deliveredMetric.id,
        name: deliveredMetric.attributes.name,
        created: deliveredMetric.attributes.created,
      }

      // Get sample events
      try {
        const deliveryEventsResponse = await klaviyoService.getEvents(
          deliveredMetric.id,
          { pageCursor: null }
        )

        if (deliveryEventsResponse.data.length > 0) {
          const sampleEvent = deliveryEventsResponse.data[0]
          result.sampleEvents.shipmentDelivered = {
            eventId: sampleEvent.id,
            timestamp: sampleEvent.attributes.timestamp,
            datetime: sampleEvent.attributes.datetime,
            eventProperties: sampleEvent.attributes.event_properties,
            availableProperties: Object.keys(
              sampleEvent.attributes.event_properties || {}
            ),
          }
        }
      } catch (error: any) {
        result.sampleEvents.shipmentDelivered = { error: error.message }
      }
    } else {
      result.targetMetrics.shipmentDelivered = {
        error: 'Metric "Wonderment - Shipment Delivered" not found',
      }
    }

    // Also list all metric names for reference
    result.allMetricNames = allMetrics.map((m) => ({
      id: m.id,
      name: m.attributes.name,
    }))

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('Check metrics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check metrics' },
      { status: 500 }
    )
  }
}

