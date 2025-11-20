import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/analysis/[id]/export - Export analysis as CSV or JSON
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    const analysis = await prisma.analysis.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    if (analysis.status !== 'completed') {
      return NextResponse.json(
        { error: 'Analysis not completed yet' },
        { status: 400 }
      )
    }

    if (format === 'csv') {
      const csv = generateCSV(analysis)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${analysis.name}.csv"`,
        },
      })
    }

    // JSON format
    return new NextResponse(JSON.stringify(analysis.results, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${analysis.name}.json"`,
      },
    })
  } catch (error) {
    console.error('Export analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to export analysis' },
      { status: 500 }
    )
  }
}

function generateCSV(analysis: any): string {
  const results = analysis.results as any
  if (!results) return ''

  const lines: string[] = []

  // Statistics section
  lines.push('Statistics')
  lines.push('Metric,Value')
  lines.push(`Total Subscribers,${results.statistics.totalSubscribers}`)
  lines.push(
    `Subscribers with Order,${results.statistics.subscribersWithOrder}`
  )
  lines.push(
    `Conversion Rate,${results.statistics.conversionRate.toFixed(2)}%`
  )
  lines.push(
    `Mean Days to First Order,${results.statistics.meanDaysToFirstOrder.toFixed(1)}`
  )
  lines.push(
    `Median Days to First Order,${results.statistics.medianDaysToFirstOrder}`
  )
  lines.push(`Standard Deviation,${results.statistics.stdDev.toFixed(1)}`)
  lines.push(
    `P25 Percentile,${results.statistics.percentiles.p25}`
  )
  lines.push(
    `P75 Percentile,${results.statistics.percentiles.p75}`
  )
  lines.push(
    `P90 Percentile,${results.statistics.percentiles.p90}`
  )
  lines.push(
    `P95 Percentile,${results.statistics.percentiles.p95}`
  )

  lines.push('')
  lines.push('Cohort Data')
  lines.push(
    'Signup Date,Cohort Label,Subscribers,Orders Placed,Conversion Rate (%),Avg Days to Order,Median Days to Order'
  )

  for (const cohort of results.cohortData) {
    lines.push(
      `${cohort.signupDate},${cohort.cohortLabel},${cohort.subscribers},${cohort.ordersPlaced},${cohort.conversionRate.toFixed(2)},${cohort.avgDaysToOrder.toFixed(1)},${cohort.medianDaysToOrder}`
    )
  }

  return lines.join('\n')
}

