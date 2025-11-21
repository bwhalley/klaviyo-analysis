'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { api } from '@/lib/api-client'

interface Metric {
  id: string
  name: string
  created?: string
  updated?: string
}

export default function NewAnalysisPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cohortPeriod: 'week' as 'day' | 'week' | 'month',
    startMetricId: '',
    conversionMetricId: '',
    startMetricFilter: '',
    conversionMetricFilter: '',
    dateRangePreset: 'all' as 'all' | 'last30' | 'last90' | 'last180' | 'thisYear' | 'lastYear' | 'custom',
    startDate: '',
    endDate: '',
  })

  // Calculate date ranges based on preset
  const getDateRangeFromPreset = (preset: string) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    switch (preset) {
      case 'last30':
        const last30 = new Date(now.setDate(now.getDate() - 30))
        return { start: last30.toISOString().split('T')[0], end: today }
      case 'last90':
        const last90 = new Date(now.setDate(now.getDate() - 90))
        return { start: last90.toISOString().split('T')[0], end: today }
      case 'last180':
        const last180 = new Date(now.setDate(now.getDate() - 180))
        return { start: last180.toISOString().split('T')[0], end: today }
      case 'thisYear':
        return { start: `${now.getFullYear()}-01-01`, end: today }
      case 'lastYear':
        return { start: `${now.getFullYear() - 1}-01-01`, end: `${now.getFullYear() - 1}-12-31` }
      case 'all':
      default:
        return { start: '', end: '' }
    }
  }

  // Fetch metrics from Klaviyo
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const response = await fetch('/api/metrics')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch metrics')
      }
      return response.json() as Promise<{ metrics: Metric[]; total: number }>
    },
  })

  const metrics = metricsData?.metrics || []

  const createMutation = useMutation({
    mutationFn: api.createAnalysis,
    onSuccess: (data: any) => {
      router.push(`/analysis/${data.analysisId}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // If date preset changes, update the date fields
    if (name === 'dateRangePreset') {
      const dateRange = getDateRangeFromPreset(value)
      setFormData(prev => ({
        ...prev,
        dateRangePreset: value as any,
        startDate: dateRange.start,
        endDate: dateRange.end,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Cohort Analysis</h1>
        <p className="text-gray-600 mt-1">
          Analyze the time between any two metrics in your Klaviyo account
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Configuration</CardTitle>
          <CardDescription>
            Configure your analysis parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {createMutation.isError && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-700 text-sm">
                {createMutation.error.message}
              </div>
            )}

            <Input
              label="Analysis Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Q1 2025 Subscriber Analysis"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Add notes about this analysis..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {metricsLoading && (
              <div className="flex items-center justify-center py-8">
                <Loading />
                <span className="ml-3 text-sm text-gray-600">Loading metrics from Klaviyo...</span>
              </div>
            )}

            {metricsError && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-700 text-sm">
                {metricsError.message}
              </div>
            )}

            {!metricsLoading && !metricsError && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Metric
                    <span className="text-danger-500 ml-1">*</span>
                  </label>
                  <select
                    name="startMetricId"
                    value={formData.startMetricId}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select start metric...</option>
                    {metrics.map((metric) => (
                      <option key={metric.id} value={metric.id}>
                        {metric.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    The metric that starts the cohort (e.g., &quot;Subscribed to List&quot;)
                  </p>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Metric Filter (Optional)
                    </label>
                    <Input
                      name="startMetricFilter"
                      value={formData.startMetricFilter}
                      onChange={handleChange}
                      placeholder='e.g., equals($attributed_message,"abc123")'
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Klaviyo API filter syntax. Example: <code className="bg-gray-100 px-1 rounded">equals($attributed_message,&quot;abc123&quot;)</code>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conversion Metric
                    <span className="text-danger-500 ml-1">*</span>
                  </label>
                  <select
                    name="conversionMetricId"
                    value={formData.conversionMetricId}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select conversion metric...</option>
                    {metrics.map((metric) => (
                      <option key={metric.id} value={metric.id}>
                        {metric.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    The metric to track conversions for (e.g., &quot;Placed Order&quot;)
                  </p>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Conversion Metric Filter (Optional)
                    </label>
                    <Input
                      name="conversionMetricFilter"
                      value={formData.conversionMetricFilter}
                      onChange={handleChange}
                      placeholder='e.g., greater-than($value,50)'
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Klaviyo API filter syntax. Example: <code className="bg-gray-100 px-1 rounded">greater-than($value,50)</code>
                    </p>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
                <span className="text-danger-500 ml-1">*</span>
              </label>
              <select
                name="dateRangePreset"
                value={formData.dateRangePreset}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="all">All Time</option>
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last 90 Days</option>
                <option value="last180">Last 180 Days</option>
                <option value="thisYear">This Year</option>
                <option value="lastYear">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Time period for events to analyze
              </p>
            </div>

            {formData.dateRangePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            {formData.dateRangePreset !== 'all' && formData.dateRangePreset !== 'custom' && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Analyzing:</strong> {formData.startDate} to {formData.endDate}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cohort Period
                <span className="text-danger-500 ml-1">*</span>
              </label>
              <select
                name="cohortPeriod"
                value={formData.cohortPeriod}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                How events should be grouped for cohort analysis
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                What happens next?
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Your Klaviyo account will be queried for the selected metric events</li>
                <li>We&apos;ll calculate time-to-conversion and cohort behavior</li>
                <li>Analysis typically takes 30-60 seconds depending on data volume</li>
                <li>You&apos;ll be redirected to the results page when complete</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                isLoading={createMutation.isPending}
                disabled={metricsLoading || !!metricsError}
              >
                Start Analysis
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

