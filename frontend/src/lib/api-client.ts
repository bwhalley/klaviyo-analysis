/**
 * API Client - Fetch-based client for API calls
 */

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }))
    throw new Error(error.error || error.message || 'An error occurred')
  }

  return response.json()
}

// API methods
export const api = {
  // Auth
  signup: (data: { email: string; password: string; name?: string }) =>
    fetchApi<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // User
  getProfile: () => fetchApi<any>('/user/profile'),
  updateProfile: (data: any) =>
    fetchApi<any>('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Analysis
  createAnalysis: (data: any) =>
    fetchApi<any>('/analysis', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAnalyses: (params?: { limit?: number; offset?: number }) => {
    const queryString = params
      ? `?${new URLSearchParams(params as any).toString()}`
      : ''
    return fetchApi<any>(`/analysis${queryString}`)
  },
  getAnalysis: (id: string) => fetchApi<any>(`/analysis/${id}`),
  deleteAnalysis: (id: string) =>
    fetchApi<any>(`/analysis/${id}`, { method: 'DELETE' }),
  exportAnalysis: async (id: string, format: 'csv' | 'json') => {
    const response = await fetch(`/api/analysis/${id}/export?format=${format}`)
    if (!response.ok) throw new Error('Export failed')
    return response.blob()
  },

  // Health
  health: () => fetchApi<any>('/health'),
}

