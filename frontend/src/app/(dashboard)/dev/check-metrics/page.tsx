'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'

export default function CheckMetricsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkMetrics = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/dev/check-metrics')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check metrics')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Check Klaviyo Metrics</h1>
        <p className="text-gray-600 mt-1">
          Preview event structure for shipping analysis
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fetch Metric Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={checkMetrics} isLoading={loading}>
            Check Metrics & Events
          </Button>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-700 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Target Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Placed Order {result.targetMetrics.placedOrder?.id ? '✅' : '❌'}
                  </h3>
                  {result.targetMetrics.placedOrder?.id ? (
                    <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                      <div>
                        <strong>ID:</strong> {result.targetMetrics.placedOrder.id}
                      </div>
                      <div>
                        <strong>Name:</strong> {result.targetMetrics.placedOrder.name}
                      </div>
                      <div>
                        <strong>Created:</strong>{' '}
                        {result.targetMetrics.placedOrder.created}
                      </div>
                    </div>
                  ) : (
                    <div className="text-danger-600">Metric not found</div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Wonderment - Shipment Delivered{' '}
                    {result.targetMetrics.shipmentDelivered?.id ? '✅' : '❌'}
                  </h3>
                  {result.targetMetrics.shipmentDelivered?.id ? (
                    <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                      <div>
                        <strong>ID:</strong> {result.targetMetrics.shipmentDelivered.id}
                      </div>
                      <div>
                        <strong>Name:</strong> {result.targetMetrics.shipmentDelivered.name}
                      </div>
                      <div>
                        <strong>Created:</strong>{' '}
                        {result.targetMetrics.shipmentDelivered.created}
                      </div>
                    </div>
                  ) : (
                    <div className="text-danger-600">Metric not found</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {result.sampleEvents?.placedOrder && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Placed Order - Sample Event</CardTitle>
              </CardHeader>
              <CardContent>
                {result.sampleEvents.placedOrder.error ? (
                  <div className="text-danger-600">
                    {result.sampleEvents.placedOrder.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Event Info</h4>
                      <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                        <div>
                          Event ID: {result.sampleEvents.placedOrder.eventId}
                        </div>
                        <div>
                          Timestamp: {result.sampleEvents.placedOrder.timestamp}
                        </div>
                        <div>
                          Datetime: {result.sampleEvents.placedOrder.datetime}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">
                        Available Properties (
                        {result.sampleEvents.placedOrder.availableProperties?.length ||
                          0}
                        )
                      </h4>
                      <div className="bg-gray-50 p-3 rounded">
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {result.sampleEvents.placedOrder.availableProperties?.map(
                            (prop: string) => (
                              <li key={prop} className="font-mono">
                                {prop}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Full Event Properties</h4>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-96 text-xs">
                        {JSON.stringify(
                          result.sampleEvents.placedOrder.eventProperties,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {result.sampleEvents?.shipmentDelivered && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Wonderment - Shipment Delivered - Sample Event</CardTitle>
              </CardHeader>
              <CardContent>
                {result.sampleEvents.shipmentDelivered.error ? (
                  <div className="text-danger-600">
                    {result.sampleEvents.shipmentDelivered.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Event Info</h4>
                      <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                        <div>
                          Event ID: {result.sampleEvents.shipmentDelivered.eventId}
                        </div>
                        <div>
                          Timestamp: {result.sampleEvents.shipmentDelivered.timestamp}
                        </div>
                        <div>
                          Datetime: {result.sampleEvents.shipmentDelivered.datetime}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">
                        Available Properties (
                        {result.sampleEvents.shipmentDelivered.availableProperties
                          ?.length || 0}
                        )
                      </h4>
                      <div className="bg-gray-50 p-3 rounded">
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {result.sampleEvents.shipmentDelivered.availableProperties?.map(
                            (prop: string) => (
                              <li key={prop} className="font-mono">
                                {prop}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Full Event Properties</h4>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-96 text-xs">
                        {JSON.stringify(
                          result.sampleEvents.shipmentDelivered.eventProperties,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {result.allMetricNames && (
            <Card>
              <CardHeader>
                <CardTitle>All Available Metrics ({result.totalMetrics})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-semibold">Metric ID</th>
                        <th className="text-left p-2 font-semibold">Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.allMetricNames.map((metric: any) => (
                        <tr key={metric.id} className="border-t">
                          <td className="p-2 font-mono text-xs">{metric.id}</td>
                          <td className="p-2">{metric.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

