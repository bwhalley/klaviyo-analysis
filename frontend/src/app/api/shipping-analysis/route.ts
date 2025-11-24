import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { KlaviyoService } from '@/services/klaviyo.service'
import { shippingAnalysisService } from '@/services/shipping-analysis.service'
import { z } from 'zod'

const shippingAnalysisSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  dateRangePreset: z
    .enum(['last30', 'last90', 'last180', 'thisYear', 'lastYear', 'custom'])
    .optional(),
  cohortPeriod: z.enum(['day', 'week', 'month']).optional(),
})

// POST /api/shipping-analysis - Create new shipping analysis
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = shippingAnalysisSchema.parse(body)

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

    // Decrypt API key
    const apiKey = decrypt(user.klaviyoApiKeyEncrypted)

    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        userId: session.user.id,
        name: validatedData.name,
        description: validatedData.description,
        status: 'pending',
        params: {
          ...validatedData,
          analysisType: 'shipping-speed-impact',
        },
      },
    })

    // Run analysis in background
    runShippingAnalysisBackground(
      analysis.id,
      apiKey,
      validatedData.startDate,
      validatedData.endDate,
      validatedData.cohortPeriod || 'week'
    )

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      message: 'Shipping analysis started',
    })
  } catch (error: any) {
    console.error('Create shipping analysis error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create analysis' },
      { status: 500 }
    )
  }
}

// GET /api/shipping-analysis - List user's shipping analyses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const [analyses, total] = await Promise.all([
      prisma.analysis.findMany({
        where: {
          userId: session.user.id,
          params: {
            path: ['analysisType'],
            equals: 'shipping-speed-impact',
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          params: true,
          results: true,
          executionTimeMs: true,
          eventsProcessed: true,
          createdAt: true,
          completedAt: true,
          errorMessage: true,
        },
      }),
      prisma.analysis.count({
        where: {
          userId: session.user.id,
          params: {
            path: ['analysisType'],
            equals: 'shipping-speed-impact',
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      analyses,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + analyses.length < total,
      },
    })
  } catch (error) {
    console.error('List shipping analyses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    )
  }
}

/**
 * Background shipping analysis runner
 */
async function runShippingAnalysisBackground(
  analysisId: string,
  apiKey: string,
  startDate: string,
  endDate: string,
  cohortPeriod: 'day' | 'week' | 'month'
) {
  try {
    const startTime = Date.now()

    // Update status to running
    await prisma.$executeRaw`
      UPDATE analyses 
      SET status = 'running', started_at = NOW()
      WHERE id = ${analysisId}::uuid
    `

    console.log(`[Shipping Analysis ${analysisId}] Starting...`)

    // Initialize Klaviyo service
    const klaviyoService = new KlaviyoService(apiKey)

    // Look up required metric IDs by name
    console.log(`[Shipping Analysis ${analysisId}] Looking up metric IDs...`)
    const metricIds = await klaviyoService.getRequiredMetricIds([
      'Placed Order',
      'Wonderment - Shipment Delivered'
    ])
    const PLACED_ORDER_ID = metricIds['Placed Order']
    const SHIPMENT_DELIVERED_ID = metricIds['Wonderment - Shipment Delivered']
    console.log(`[Shipping Analysis ${analysisId}] Using Placed Order ID: ${PLACED_ORDER_ID}`)
    console.log(`[Shipping Analysis ${analysisId}] Using Shipment Delivered ID: ${SHIPMENT_DELIVERED_ID}`)

    // Parse dates (validated as required in schema)
    const start = new Date(startDate)
    const end = new Date(endDate)

    console.log(
      `[Shipping Analysis ${analysisId}] Date range: ${start.toISOString()} to ${end.toISOString()}`
    )

    // Step 1: Fetch orders in the analysis window
    console.log(`[Shipping Analysis ${analysisId}] Fetching orders in window...`)
    const orderEventsRaw = await klaviyoService.getAllEvents(
      PLACED_ORDER_ID,
      startDate,
      endDate
    )
    const orderEvents =
      shippingAnalysisService.parseOrderEvents(orderEventsRaw)
    console.log(
      `[Shipping Analysis ${analysisId}] Found ${orderEvents.length} orders in window`
    )

    // Step 2: Fetch delivery events (extend window for late deliveries)
    console.log(
      `[Shipping Analysis ${analysisId}] Fetching delivery events...`
    )
    const endDateExtended = new Date(end.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const deliveryEventsRaw = await klaviyoService.getDeliveryEvents(
      SHIPMENT_DELIVERED_ID,
      startDate,
      endDateExtended
    )
    const deliveryEvents =
      shippingAnalysisService.parseDeliveryEvents(deliveryEventsRaw)
    console.log(
      `[Shipping Analysis ${analysisId}] Found ${deliveryEvents.length} delivery events`
    )

    // Step 3: Get unique profiles and fetch their complete order histories
    console.log(
      `[Shipping Analysis ${analysisId}] Fetching lifetime order histories...`
    )
    const profileIds = [...new Set(orderEvents.map((o) => o.profileId))].filter(
      (id) => id
    )
    console.log(
      `[Shipping Analysis ${analysisId}] Found ${profileIds.length} unique profiles`
    )

    // Fetch all orders for each profile (lifetime, no date filter)
    const allOrdersByProfile = new Map<string, any[]>()
    const allOrdersRaw = await klaviyoService.getAllEvents(
      PLACED_ORDER_ID
    )
    const allOrders = shippingAnalysisService.parseOrderEvents(allOrdersRaw)

    // Group by profile
    for (const order of allOrders) {
      if (!order.profileId) continue
      if (!allOrdersByProfile.has(order.profileId)) {
        allOrdersByProfile.set(order.profileId, [])
      }
      allOrdersByProfile.get(order.profileId)!.push(order)
    }

    console.log(
      `[Shipping Analysis ${analysisId}] Fetched ${allOrders.length} total orders across ${allOrdersByProfile.size} profiles`
    )

    // Step 4: Link orders to deliveries
    console.log(`[Shipping Analysis ${analysisId}] Linking orders to deliveries...`)
    const deliveryMap = shippingAnalysisService.linkOrdersToDeliveries(
      orderEvents,
      deliveryEvents
    )

    // Step 5: Build profile timelines (only lifetime first orders in window)
    console.log(`[Shipping Analysis ${analysisId}] Building profile timelines...`)
    const timelines = shippingAnalysisService.buildProfileTimelines(
      orderEvents,
      allOrdersByProfile,
      deliveryMap,
      start,
      end,
      cohortPeriod
    )

    console.log(
      `[Shipping Analysis ${analysisId}] Created ${timelines.length} profile timelines`
    )

    // Step 6: Calculate delivery quartiles per shipping rate
    console.log(
      `[Shipping Analysis ${analysisId}] Calculating delivery quartiles...`
    )
    const quartileMap =
      shippingAnalysisService.calculateDeliveryQuartiles(timelines)

    console.log(
      `[Shipping Analysis ${analysisId}] Calculated quartiles for ${quartileMap.size} shipping rates`
    )

    // Step 7: Assign quartiles to timelines
    const timelinesWithQuartiles =
      shippingAnalysisService.assignDeliveryQuartiles(timelines, quartileMap)

    // Step 8: Aggregate into cohort cells
    console.log(`[Shipping Analysis ${analysisId}] Aggregating cohorts...`)
    const cohorts =
      shippingAnalysisService.aggregateCohorts(timelinesWithQuartiles)

    console.log(
      `[Shipping Analysis ${analysisId}] Created ${cohorts.length} cohort cells`
    )

    // Calculate summary statistics
    const totalProfiles = timelines.length
    const profilesWithDelivery = timelines.filter((t) => t.hasDeliveryData).length
    const profilesWithRepeat = timelines.filter((t) => t.secondOrder !== null)
      .length
    const overallRepeatRate = profilesWithRepeat / totalProfiles

    // Get unique shipping rates
    const shippingRates = Array.from(
      new Set(timelines.map((t) => t.shippingRateGroup))
    ).map((rate) => {
      const timelinesForRate = timelines.filter(
        (t) => t.shippingRateGroup === rate
      )
      const quartiles = quartileMap.get(rate)
      const durationsForRate = timelinesForRate
        .map((t) => t.firstOrder.deliveryDurationDays)
        .filter((d): d is number => d !== null)
      const avgDelivery =
        durationsForRate.length > 0
          ? durationsForRate.reduce((sum, d) => sum + d, 0) /
            durationsForRate.length
          : null

      return {
        rate,
        customerCount: timelinesForRate.length,
        avgDeliveryDays: avgDelivery,
        quartileThresholds: quartiles || null,
      }
    })

    const executionTime = Date.now() - startTime

    const results = {
      summary: {
        totalProfiles,
        profilesWithDelivery,
        profilesWithRepeat,
        overallRepeatRate,
        analysisWindow: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        cohortPeriod,
      },
      shippingRates,
      cohorts,
      quartileMap: Object.fromEntries(quartileMap),
    }

    // Save results
    await prisma.$executeRaw`
      UPDATE analyses 
      SET status = 'completed',
          results = ${JSON.stringify(results)}::jsonb,
          execution_time_ms = ${executionTime},
          events_processed = ${orderEventsRaw.length + deliveryEventsRaw.length},
          completed_at = NOW()
      WHERE id = ${analysisId}::uuid
    `

    console.log(
      `[Shipping Analysis ${analysisId}] ✅ Completed in ${executionTime}ms`
    )
  } catch (error: any) {
    console.error(`[Shipping Analysis ${analysisId}] ❌ Failed:`, error)

    // Update failure status
    await prisma.$executeRaw`
      UPDATE analyses 
      SET status = 'failed',
          error_message = ${error.message || 'Unknown error'},
          error_stack = ${error.stack || ''},
          completed_at = NOW()
      WHERE id = ${analysisId}::uuid
    `
  }
}

