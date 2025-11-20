'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { CohortDataPoint } from '@/types'

interface CohortChartProps {
  data: CohortDataPoint[]
  type?: 'line' | 'bar'
}

export function CohortChart({ data, type = 'line' }: CohortChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        No cohort data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      {type === 'line' ? (
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="cohortLabel"
            angle={-45}
            textAnchor="end"
            height={100}
            fontSize={12}
          />
          <YAxis yAxisId="left" label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Avg Days to Order', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'conversionRate') {
                return [`${value.toFixed(2)}%`, 'Conversion Rate']
              }
              if (name === 'avgDaysToOrder') {
                return [`${value.toFixed(1)} days`, 'Avg Days to Order']
              }
              return [value, name]
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="conversionRate"
            stroke="#0ea5e9"
            name="Conversion Rate (%)"
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgDaysToOrder"
            stroke="#22c55e"
            name="Avg Days to Order"
            strokeWidth={2}
          />
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="cohortLabel"
            angle={-45}
            textAnchor="end"
            height={100}
            fontSize={12}
          />
          <YAxis yAxisId="left" label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Avg Days to Order', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'conversionRate') {
                return [`${value.toFixed(2)}%`, 'Conversion Rate']
              }
              if (name === 'avgDaysToOrder') {
                return [`${value.toFixed(1)} days`, 'Avg Days to Order']
              }
              return [value, name]
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="conversionRate"
            fill="#0ea5e9"
            name="Conversion Rate (%)"
          />
          <Bar
            yAxisId="right"
            dataKey="avgDaysToOrder"
            fill="#22c55e"
            name="Avg Days to Order"
          />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}

