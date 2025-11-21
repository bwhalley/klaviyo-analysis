/**
 * Klaviyo Service - Handles all Klaviyo API interactions
 * Port of logic from src/utils.ts
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import { KlaviyoEvent, KlaviyoMetric, KlaviyoListResponse } from '@/types'
import { extractCursor, retry } from '@/lib/utils'
import { cacheService } from './cache.service'

export const METRIC_IDS = {
  SUBSCRIBED_TO_LIST: 'UfyMVA',
  PLACED_ORDER: 'UhZHSf',
} as const

export class KlaviyoService {
  private apiKey: string
  private baseUrl: string
  private axiosInstance: AxiosInstance

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.baseUrl =
      process.env.KLAVIYO_API_BASE_URL || 'https://a.klaviyo.com/api'
    
    // Create axios instance with proper SSL/TLS configuration for Docker
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
        'revision': '2024-10-15',
        'Content-Type': 'application/json',
      },
      // Disable SSL verification only if explicitly set (for dev environments)
      // In production, always verify SSL
      httpsAgent: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? 
        undefined : 
        undefined,
    })
  }

  /**
   * Make API request to Klaviyo with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: { params?: Record<string, any> } = {}
  ): Promise<T> {
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Klaviyo] Request to ${endpoint} (attempt ${attempt}/${maxRetries})`)
        
        const response = await this.axiosInstance.get<T>(endpoint, {
          params: options.params,
        })

        return response.data
      } catch (error) {
        lastError = error as Error
        
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError
          
          // Log detailed error information
          console.error(`[Klaviyo] Request failed (attempt ${attempt}/${maxRetries}):`, {
            message: axiosError.message,
            code: axiosError.code,
            status: axiosError.response?.status,
            url: `${this.baseUrl}${endpoint}`,
            cause: axiosError.cause,
          })
          
          // Don't retry on 4xx errors (client errors)
          if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
            throw new Error(
              `Klaviyo API Error (${axiosError.response.status}): ${JSON.stringify(axiosError.response.data)}`
            )
          }
          
          // For network errors, wait before retrying
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000 // 2s, 4s, 6s
            console.log(`[Klaviyo] Waiting ${waitTime}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        } else {
          console.error(`[Klaviyo] Unexpected error:`, error)
          throw error
        }
      }
    }

    // If all retries failed, throw the last error
    throw new Error(
      `Klaviyo API request failed after ${maxRetries} attempts: ${lastError?.message}`
    )
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.request('/metrics?page[size]=1')
      return true
    } catch (error) {
      console.error('Klaviyo API key validation failed:', error)
      return false
    }
  }

  /**
   * Get all metrics
   */
  async getMetrics(): Promise<KlaviyoListResponse<KlaviyoMetric>> {
    return cacheService.get(
      `klaviyo:metrics:${this.apiKey}`,
      async () => {
        return this.request<KlaviyoListResponse<KlaviyoMetric>>(
          '/metrics?fields[metric]=name,created,updated'
        )
      },
      3600 // Cache for 1 hour
    )
  }

  /**
   * Get metric by name
   */
  async getMetricByName(name: string): Promise<KlaviyoMetric | null> {
    const metrics = await this.getMetrics()
    return (
      metrics.data.find(
        (m) => m.attributes.name.toLowerCase() === name.toLowerCase()
      ) || null
    )
  }

  /**
   * Get events for a specific metric
   */
  async getEvents(
    metricId: string,
    options: {
      pageCursor?: string | null
      filters?: any[]
      sort?: string
      startDate?: string
      endDate?: string
      customFilter?: string
    } = {}
  ): Promise<KlaviyoListResponse<KlaviyoEvent>> {
    let endpoint = `/events?fields[event]=timestamp,datetime,uuid,event_properties`
    
    // Build filter string
    let filters: string[] = [`equals(metric_id,"${metricId}")`]
    
    // Add date range filters if provided
    if (options.startDate) {
      filters.push(`greater-or-equal(datetime,${options.startDate}T00:00:00Z)`)
    }
    if (options.endDate) {
      filters.push(`less-or-equal(datetime,${options.endDate}T23:59:59Z)`)
    }
    
    // Add custom filter if provided (e.g., event property filters)
    if (options.customFilter) {
      filters.push(options.customFilter)
    }
    
    // Combine filters with AND
    if (filters.length > 0) {
      endpoint += `&filter=and(${filters.join(',')})`
    }

    if (options.sort) {
      endpoint += `&sort=${options.sort}`
    }

    if (options.pageCursor) {
      endpoint += `&page[cursor]=${encodeURIComponent(options.pageCursor)}`
    }

    return retry(
      () => this.request<KlaviyoListResponse<KlaviyoEvent>>(endpoint),
      { retries: 3, delay: 500 }
    )
  }

  /**
   * Get all events with pagination
   */
  async getAllEventsWithPagination(
    metricId: string,
    options: {
      onProgress?: (page: number, total: number) => void
      startDate?: string
      endDate?: string
      customFilter?: string
    } = {}
  ): Promise<KlaviyoEvent[]> {
    const allEvents: KlaviyoEvent[] = []
    let pageCursor: string | null = null
    let pageCount = 0

    do {
      pageCount++
      console.log(`Fetching events, page ${pageCount}...`)

      const response = await this.getEvents(metricId, {
        pageCursor,
        sort: 'datetime',
        startDate: options.startDate,
        endDate: options.endDate,
        customFilter: options.customFilter,
      })

      if (response.data) {
        allEvents.push(...response.data)
        console.log(
          `  ✓ Got ${response.data.length} events (total: ${allEvents.length})`
        )
      }

      options.onProgress?.(pageCount, allEvents.length)

      pageCursor = extractCursor(response.links?.next || null)

      // Small delay to avoid rate limiting
      if (pageCursor) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    } while (pageCursor)

    console.log(`✅ Fetched ${allEvents.length} total events`)
    return allEvents
  }

  /**
   * Get all events for any metric (alias for getAllEventsWithPagination)
   */
  async getAllEvents(metricId: string, startDate?: string, endDate?: string, customFilter?: string): Promise<KlaviyoEvent[]> {
    return this.getAllEventsWithPagination(metricId, { startDate, endDate, customFilter })
  }

  /**
   * Get subscription events (legacy - use getAllEvents with metric ID instead)
   * @deprecated
   */
  async getSubscriptionEvents(): Promise<KlaviyoEvent[]> {
    return this.getAllEventsWithPagination(METRIC_IDS.SUBSCRIBED_TO_LIST)
  }

  /**
   * Get order events (legacy - use getAllEvents with metric ID instead)
   * @deprecated
   */
  async getOrderEvents(): Promise<KlaviyoEvent[]> {
    return this.getAllEventsWithPagination(METRIC_IDS.PLACED_ORDER)
  }

  /**
   * Get lists
   */
  async getLists(): Promise<any[]> {
    const response = await this.request<any>('/lists?fields[list]=name')
    return response.data || []
  }

  /**
   * Get segments
   */
  async getSegments(): Promise<any[]> {
    const response = await this.request<any>('/segments?fields[segment]=name')
    return response.data || []
  }
}

