'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { api } from '@/lib/api-client'
import { Check } from 'lucide-react'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [klaviyoApiKey, setKlaviyoApiKey] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
  })

  const updateMutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setKlaviyoApiKey('')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (klaviyoApiKey) {
      updateMutation.mutate({ klaviyoApiKey })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loading />
      </div>
    )
  }

  const user = data?.user

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account and integration settings
        </p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <p className="text-gray-900 mt-1">{user?.email}</p>
          </div>
          {user?.name && (
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <p className="text-gray-900 mt-1">{user.name}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Klaviyo Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Klaviyo Integration</CardTitle>
          <CardDescription>
            Connect your Klaviyo account to run analyses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {showSuccess && (
              <div className="p-3 rounded-lg bg-success-50 border border-success-200 text-success-700 text-sm flex items-center gap-2">
                <Check className="h-4 w-4" />
                API key updated successfully!
              </div>
            )}

            {updateMutation.isError && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-700 text-sm">
                {updateMutation.error.message}
              </div>
            )}

            <div>
              {user?.hasKlaviyoKey ? (
                <div className="mb-4 p-3 rounded-lg bg-success-50 border border-success-200">
                  <p className="text-sm text-success-800 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Klaviyo API key is configured
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-lg bg-warning-50 border border-warning-200">
                  <p className="text-sm text-warning-800">
                    No Klaviyo API key configured. Add one to start running analyses.
                  </p>
                </div>
              )}

              <Input
                label="Klaviyo Private API Key"
                type="password"
                value={klaviyoApiKey}
                onChange={(e) => setKlaviyoApiKey(e.target.value)}
                placeholder={user?.hasKlaviyoKey ? "Enter new key to update" : "pk_..."}
              />
              <p className="mt-2 text-sm text-gray-500">
                Your API key is encrypted and stored securely. Find your API key in{' '}
                <a
                  href="https://www.klaviyo.com/settings/account/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700"
                >
                  Klaviyo Settings → API Keys
                </a>
              </p>
            </div>

            <Button
              type="submit"
              disabled={!klaviyoApiKey}
              isLoading={updateMutation.isPending}
            >
              {user?.hasKlaviyoKey ? 'Update API Key' : 'Save API Key'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Required Permissions
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Read metrics</li>
              <li>Read events</li>
              <li>Read profiles</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your analysis settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Default Cohort Period
              </label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                defaultValue={user?.defaultCohortPeriod || 'week'}
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Timezone
              </label>
              <p className="text-sm text-gray-600 mt-1">
                {user?.timezone || 'UTC'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

