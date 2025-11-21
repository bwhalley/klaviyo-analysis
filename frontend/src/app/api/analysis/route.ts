import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { KlaviyoService } from '@/services/klaviyo.service'
import { analysisService } from '@/services/analysis.service'
import { z } from 'zod'

const analysisSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  startMetricId: z.string().min(1, 'Start metric is required'),
  conversionMetricId: z.string().min(1, 'Conversion metric is required'),
  startMetricFilter: z.string().optional(),
  conversionMetricFilter: z.string().optional(),
  dateRangePreset: z.enum(['all', 'last30', 'last90', 'last180', 'thisYear', 'lastYear', 'custom']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cohortPeriod: z.enum(['day', 'week', 'month']).optional(),
  filters: z
    .object({
      lists: z.array(z.string()).optional(),
      segments: z.array(z.string()).optional(),
    })
    .optional(),
})

// POST /api/analysis - Create new analysis
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = analysisSchema.parse(body)

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
        params: validatedData,
      },
    })

    // Run analysis in background (simplified version - in production use a job queue)
    runAnalysisBackground(
      analysis.id,
      apiKey,
      validatedData.startMetricId,
      validatedData.conversionMetricId,
      validatedData.cohortPeriod || 'week',
      validatedData.startDate,
      validatedData.endDate,
      validatedData.startMetricFilter,
      validatedData.conversionMetricFilter
    )

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      message: 'Analysis started',
    })
  } catch (error: any) {
    console.error('Create analysis error:', error)

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

// GET /api/analysis - List user's analyses
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
        where: { userId: session.user.id },
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
        where: { userId: session.user.id },
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
    console.error('List analyses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    )
  }
}

/**
 * Background analysis runner
 * In production, this should be moved to a job queue (Bull, BullMQ, etc.)
 */
async function runAnalysisBackground(
  analysisId: string,
  apiKey: string,
  startMetricId: string,
  conversionMetricId: string,
  cohortPeriod: 'day' | 'week' | 'month',
  startDate?: string,
  endDate?: string,
  startMetricFilter?: string,
  conversionMetricFilter?: string
) {
  try {
    const startTime = Date.now()

    // Update status to running - use raw SQL to avoid minifier issues
    await prisma.$executeRaw`
      UPDATE analyses 
      SET status = 'running', started_at = NOW()
      WHERE id = ${analysisId}::uuid
    `

    // Initialize Klaviyo service
    const klaviyoService = new KlaviyoService(apiKey)

    // Fetch events for the selected metrics
    const dateRangeMsg = startDate && endDate ? ` from ${startDate} to ${endDate}` : ' (all time)'
    const startFilterMsg = startMetricFilter ? ` with filter: ${startMetricFilter}` : ''
    const conversionFilterMsg = conversionMetricFilter ? ` with filter: ${conversionMetricFilter}` : ''
    
    console.log(`[Analysis ${analysisId}] Fetching start metric events (${startMetricId})${dateRangeMsg}${startFilterMsg}...`)
    const startEvents = await klaviyoService.getAllEvents(startMetricId, startDate, endDate, startMetricFilter)

    console.log(`[Analysis ${analysisId}] Fetching conversion metric events (${conversionMetricId})${dateRangeMsg}${conversionFilterMsg}...`)
    const conversionEvents = await klaviyoService.getAllEvents(conversionMetricId, startDate, endDate, conversionMetricFilter)

    // Run analysis
    console.log(`[Analysis ${analysisId}] Running analysis with ${startEvents.length} start events and ${conversionEvents.length} conversion events...`)
    const results = await analysisService.runAnalysis(
      startEvents,
      conversionEvents,
      cohortPeriod
    )

    const executionTime = Date.now() - startTime

    // Save results - use raw SQL to avoid minifier issues
    await prisma.$executeRaw`
      UPDATE analyses 
      SET status = 'completed',
          results = ${JSON.stringify(results)}::jsonb,
          execution_time_ms = ${executionTime},
          events_processed = ${startEvents.length + conversionEvents.length},
          completed_at = NOW()
      WHERE id = ${analysisId}::uuid
    `

    // Optionally save profile data
    // This is commented out to avoid overwhelming the database
    // In production, you might want to paginate or stream this data
    /*
    await prisma.analysisProfile.createMany({
      data: results.profiles.slice(0, 1000).map(p => ({
        analysisId,
        profileId: p.profileID,
        email: p.email,
        subscriptionDate: p.firstSubscriptionDate,
        firstOrderDate: p.firstOrderDate,
        daysToFirstOrder: p.daysToFirstOrder,
      })),
    })
    */

    console.log(`[Analysis ${analysisId}] ✅ Completed in ${executionTime}ms`)
  } catch (error: any) {
    console.error(`[Analysis ${analysisId}] ❌ Failed:`, error)
    
    // Update failure status - use raw SQL to avoid minifier issues
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

