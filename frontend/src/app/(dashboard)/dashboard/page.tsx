'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { api } from '@/lib/api-client'
import { Plus, TrendingUp, Users, Clock, CheckCircle, XCircle, Loader } from 'lucide-react'
import { formatDateTime, formatNumber, formatPercentage } from '@/lib/utils'

export default function DashboardPage() {
  const { data: analysesData, isLoading } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => api.getAnalyses({ limit: 10 }),
  })

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
  })

  const analyses = analysesData?.analyses || []
  const hasKlaviyoKey = profileData?.user?.hasKlaviyoKey

  // Calculate summary stats
  const totalAnalyses = analyses.length
  const completedAnalyses = analyses.filter((a: any) => a.status === 'completed').length
  const avgConversionRate =
    completedAnalyses > 0
      ? analyses
          .filter((a: any) => a.status === 'completed' && a.results)
          .reduce((sum: number, a: any) => sum + (a.results?.statistics?.conversionRate || 0), 0) /
        completedAnalyses
      : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here&apos;s an overview of your analyses.
          </p>
        </div>
        <Link href="/analysis/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Analysis
          </Button>
        </Link>
      </div>

      {/* Klaviyo API Key Warning */}
      {!hasKlaviyoKey && (
        <Card className="border-warning-200 bg-warning-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-warning-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-warning-800">
                  Klaviyo API Key Required
                </h3>
                <p className="mt-1 text-sm text-warning-700">
                  You need to add your Klaviyo API key to run analyses.
                </p>
                <Link href="/settings">
                  <Button variant="outline" size="sm" className="mt-3">
                    Add API Key
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total Analyses"
          value={totalAnalyses}
          icon={<TrendingUp className="h-8 w-8 text-primary-600" />}
        />
        <StatsCard
          title="Completed"
          value={completedAnalyses}
          icon={<CheckCircle className="h-8 w-8 text-success-600" />}
        />
        <StatsCard
          title="Avg Conversion Rate"
          value={formatPercentage(avgConversionRate, 1)}
          icon={<Users className="h-8 w-8 text-primary-600" />}
        />
      </div>

      {/* Recent Analyses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Analyses</CardTitle>
          <CardDescription>Your most recent analysis runs</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loading />
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No analyses yet</p>
              <Link href="/analysis/new">
                <Button>Create Your First Analysis</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis: any) => (
                <AnalysisRow key={analysis.id} analysis={analysis} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function AnalysisRow({ analysis }: { analysis: any }) {
  const statusConfig = {
    completed: {
      icon: <CheckCircle className="h-5 w-5 text-success-600" />,
      color: 'text-success-700',
      bg: 'bg-success-50',
    },
    running: {
      icon: <Loader className="h-5 w-5 text-primary-600 animate-spin" />,
      color: 'text-primary-700',
      bg: 'bg-primary-50',
    },
    failed: {
      icon: <XCircle className="h-5 w-5 text-danger-600" />,
      color: 'text-danger-700',
      bg: 'bg-danger-50',
    },
    pending: {
      icon: <Clock className="h-5 w-5 text-gray-600" />,
      color: 'text-gray-700',
      bg: 'bg-gray-50',
    },
  }

  const config = statusConfig[analysis.status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <Link href={`/analysis/${analysis.id}`}>
      <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-4 flex-1">
          <div className={`p-2 rounded-lg ${config.bg}`}>{config.icon}</div>
          <div className="flex-1">
            <h4 className="font-medium">{analysis.name}</h4>
            <p className="text-sm text-gray-600">{formatDateTime(analysis.createdAt)}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.color}`}>
            {analysis.status}
          </span>
          {analysis.status === 'completed' && analysis.results && (
            <p className="text-sm text-gray-600 mt-1">
              {formatNumber(analysis.results.statistics.totalSubscribers)} subscribers
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

