// Analysis Types
export interface ProfileData {
  profileID: string
  email?: string
  firstSubscriptionDate: Date
  firstOrderDate: Date | null
  daysToFirstOrder: number | null
}

export interface Statistics {
  totalSubscribers: number
  subscribersWithOrder: number
  conversionRate: number
  meanDaysToFirstOrder: number
  medianDaysToFirstOrder: number
  stdDev: number
  percentiles: {
    p25: number
    p75: number
    p90: number
    p95: number
  }
}

export interface CohortDataPoint {
  signupDate: string
  cohortLabel: string
  subscribers: number
  ordersPlaced: number
  conversionRate: number
  avgDaysToOrder: number
  medianDaysToOrder: number
}

export interface AnalysisParams {
  dateRange?: {
    start: string
    end: string
  }
  cohortPeriod?: 'day' | 'week' | 'month'
  filters?: {
    lists?: string[]
    segments?: string[]
  }
}

export interface AnalysisResult {
  statistics: Statistics
  cohortData: CohortDataPoint[]
  profiles: ProfileData[]
}

// API Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Klaviyo Types
export interface KlaviyoEvent {
  id: string
  type: 'event'
  attributes: {
    timestamp: number
    datetime: string
    uuid: string
    event_properties?: Record<string, any>
  }
  relationships: {
    profile: {
      data: {
        type: 'profile'
        id: string
      }
    }
    metric: {
      data: {
        type: 'metric'
        id: string
      }
    }
  }
}

export interface KlaviyoMetric {
  id: string
  type: 'metric'
  attributes: {
    name: string
    created: string
    updated: string
    integration?: {
      object: string
      category: string
    }
  }
}

export interface KlaviyoListResponse<T> {
  data: T[]
  links: {
    self: string
    next: string | null
    prev: string | null
  }
}

// User Types
export interface User {
  id: string
  email: string
  name?: string
  role: string
  klaviyoApiKeyEncrypted?: string
  hasKlaviyoKey: boolean
}

// Analysis Database Types
export interface AnalysisRecord {
  id: string
  name: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  params: AnalysisParams
  results?: AnalysisResult
  errorMessage?: string
  executionTimeMs?: number
  eventsProcessed?: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

