import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { KlaviyoService } from '@/services/klaviyo.service'

/**
 * GET /api/metrics
 * Fetch all metrics from the user's Klaviyo account
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Klaviyo API key
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { klaviyoApiKeyEncrypted: true },
    })

    if (!user?.klaviyoApiKeyEncrypted) {
      return NextResponse.json(
        { error: 'Klaviyo API key not configured. Please add it in Settings.' },
        { status: 400 }
      )
    }

    // Decrypt API key and fetch metrics
    const apiKey = decrypt(user.klaviyoApiKeyEncrypted)
    const klaviyoService = new KlaviyoService(apiKey)

    const metricsResponse = await klaviyoService.getMetrics()

    // Transform to a simpler format
    const metrics = metricsResponse.data.map((metric) => ({
      id: metric.id,
      name: metric.attributes.name,
      created: metric.attributes.created,
      updated: metric.attributes.updated,
    }))

    // Sort by name for better UX
    metrics.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      metrics,
      total: metrics.length,
    })
  } catch (error: any) {
    console.error('Failed to fetch metrics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

