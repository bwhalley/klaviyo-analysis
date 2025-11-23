'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card'

export default function NewShippingAnalysisPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cohortPeriod: 'week' as 'day' | 'week' | 'month',
    dateRangePreset: 'last90' as
      | 'last30'
      | 'last90'
      | 'last180'
      | 'thisYear'
      | 'lastYear'
      | 'custom',
    startDate: '',
    endDate: '',
  })

  // Calculate date ranges based on preset
  const getDateRangeFromPreset = (preset: string) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    switch (preset) {
      case 'last30':
        const last30 = new Date(now)
        last30.setDate(now.getDate() - 30)
        return { start: last30.toISOString().split('T')[0], end: today }
      case 'last90':
        const last90 = new Date(now)
        last90.setDate(now.getDate() - 90)
        return { start: last90.toISOString().split('T')[0], end: today }
      case 'last180':
        const last180 = new Date(now)
        last180.setDate(now.getDate() - 180)
        return { start: last180.toISOString().split('T')[0], end: today }
      case 'thisYear':
        return { start: `${now.getFullYear()}-01-01`, end: today }
      case 'lastYear':
        return {
          start: `${now.getFullYear() - 1}-01-01`,
          end: `${now.getFullYear() - 1}-12-31`,
        }
      default:
        return { start: '', end: '' }
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/shipping-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create analysis')
      }

      return response.json()
    },
    onSuccess: (data: any) => {
      router.push(`/analysis/${data.analysisId}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target

    // If date preset changes, update the date fields
    if (name === 'dateRangePreset') {
      const dateRange = getDateRangeFromPreset(value)
      setFormData((prev) => ({
        ...prev,
        dateRangePreset: value as any,
        startDate: dateRange.start,
        endDate: dateRange.end,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Shipping Speed Impact Analysis
        </h1>
        <p className="text-gray-600 mt-1">
          Analyze how shipping speed affects repeat purchase behavior for new
          customers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Configuration</CardTitle>
          <CardDescription>
            This analysis examines customers who placed their FIRST lifetime order
            in the selected period
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
              placeholder="e.g., Q4 2024 New Customer Shipping Analysis"
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
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last 90 Days</option>
                <option value="last180">Last 180 Days</option>
                <option value="thisYear">This Year</option>
                <option value="lastYear">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Time period for first-time customer orders to analyze
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

            {formData.dateRangePreset !== 'custom' && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Analyzing:</strong> {formData.startDate} to{' '}
                  {formData.endDate}
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
                How customers should be grouped by their first order date
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                📦 What This Analysis Does
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>
                  Identifies customers whose <strong>first lifetime order</strong>{' '}
                  was in your selected date range
                </li>
                <li>
                  Groups them by <strong>shipping rate</strong> (Economy, Express,
                  etc.)
                </li>
                <li>
                  Calculates <strong>delivery speed quartiles</strong> for each
                  shipping rate
                </li>
                <li>
                  Tracks if/when each customer placed a <strong>second order</strong>
                </li>
                <li>
                  Shows correlation between delivery speed and repeat purchase
                  behavior
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-amber-900 mb-1">
                ⏱️ Processing Time
              </h4>
              <p className="text-sm text-amber-800">
                This analysis fetches ALL lifetime order data for matching customers.
                Expect 2-5 minutes for 90-day windows depending on order volume.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                isLoading={createMutation.isPending}
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

