'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { CohortChart } from '@/components/Charts/CohortChart'
import { api } from '@/lib/api-client'
import { Download, Trash2, TrendingUp, Users, Clock, Target, ArrowLeft } from 'lucide-react'
import { formatNumber, formatPercentage, formatDateTime } from '@/lib/utils'

export default function AnalysisResultsPage() {
  const params = useParams()
  const router = useRouter()
  const analysisId = params.id as string

  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: () => api.getAnalysis(analysisId),
    refetchInterval: (data:any) => {
      // Refetch every 3 seconds if analysis is running
      return data?.analysis?.status === 'running' || data?.analysis?.status === 'pending'
        ? 3000
        : false
    },
  })

  const analysis = data?.analysis

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loading text="Loading analysis..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-danger-600 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Error Loading Analysis</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Analysis not found</p>
      </div>
    )
  }

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await api.exportAnalysis(analysisId, format)
      const url = window.URL.createObjectURL(blob as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${analysis.name}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this analysis?')) {
      try {
        await api.deleteAnalysis(analysisId)
        router.push('/dashboard')
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-start justify-between mt-4">
          <div>
            <h1 className="text-3xl font-bold">{analysis.name}</h1>
            {analysis.description && (
              <p className="text-gray-600 mt-1">{analysis.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Created {formatDateTime(analysis.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            {analysis.status === 'completed' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </>
            )}
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status */}
      {analysis.status !== 'completed' && (
        <Card>
          <CardContent className="pt-6">
            {analysis.status === 'running' && (
              <div className="flex items-center gap-3">
                <Loading size="sm" />
                <div>
                  <p className="font-medium">Analysis in progress...</p>
                  <p className="text-sm text-gray-600">
                    This usually takes 30-60 seconds. This page will update automatically.
                  </p>
                </div>
              </div>
            )}
            {analysis.status === 'pending' && (
              <div>
                <p className="font-medium">Analysis pending...</p>
                <p className="text-sm text-gray-600">Waiting to start</p>
              </div>
            )}
            {analysis.status === 'failed' && (
              <div className="text-danger-600">
                <p className="font-medium">Analysis failed</p>
                <p className="text-sm">{analysis.errorMessage || 'An error occurred'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {analysis.status === 'completed' && analysis.results && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Subscribers"
              value={formatNumber(analysis.results.statistics.totalSubscribers)}
              icon={<Users className="h-8 w-8 text-primary-600" />}
            />
            <StatCard
              title="Conversion Rate"
              value={formatPercentage(analysis.results.statistics.conversionRate, 1)}
              icon={<Target className="h-8 w-8 text-success-600" />}
            />
            <StatCard
              title="Median Days to Order"
              value={`${analysis.results.statistics.medianDaysToFirstOrder} days`}
              icon={<Clock className="h-8 w-8 text-primary-600" />}
            />
            <StatCard
              title="Subscribers with Order"
              value={formatNumber(analysis.results.statistics.subscribersWithOrder)}
              icon={<TrendingUp className="h-8 w-8 text-success-600" />}
            />
          </div>

          {/* Detailed Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Statistics</CardTitle>
              <CardDescription>Comprehensive analysis metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatItem
                  label="Mean Days to Order"
                  value={analysis.results.statistics.meanDaysToFirstOrder.toFixed(1)}
                />
                <StatItem
                  label="Standard Deviation"
                  value={analysis.results.statistics.stdDev.toFixed(1)}
                />
                <StatItem
                  label="25th Percentile"
                  value={`${analysis.results.statistics.percentiles.p25} days`}
                />
                <StatItem
                  label="75th Percentile"
                  value={`${analysis.results.statistics.percentiles.p75} days`}
                />
                <StatItem
                  label="90th Percentile"
                  value={`${analysis.results.statistics.percentiles.p90} days`}
                />
                <StatItem
                  label="95th Percentile"
                  value={`${analysis.results.statistics.percentiles.p95} days`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cohort Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cohort Analysis</CardTitle>
              <CardDescription>
                Conversion rate and average days to order by signup cohort
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CohortChart data={analysis.results.cohortData} type="line" />
            </CardContent>
          </Card>

          {/* Execution Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Processed {formatNumber(analysis.eventsProcessed || 0)} events
                </span>
                <span>
                  Completed in {((analysis.executionTimeMs || 0) / 1000).toFixed(2)}s
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  )
}

