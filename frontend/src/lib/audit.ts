/**
 * Audit Logging Utility
 * Provides comprehensive audit trail for security and compliance
 */

import { prisma } from './prisma'
import crypto from 'crypto'

export type AuditAction =
  // Authentication
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_change'
  | 'auth.account_locked'
  | 'auth.account_unlocked'
  // API Keys
  | 'apikey.create'
  | 'apikey.update'
  | 'apikey.delete'
  | 'apikey.view'
  // Analysis
  | 'analysis.create'
  | 'analysis.view'
  | 'analysis.delete'
  | 'analysis.export'
  // Settings
  | 'settings.update'
  | 'settings.retention_change'
  // Admin
  | 'admin.user_view'
  | 'admin.user_modify'

export type AuditResult = 'success' | 'failure' | 'error'

export interface AuditLogData {
  userId?: string
  sessionId?: string
  action: AuditAction
  resource?: string
  resourceId?: string
  result: AuditResult
  errorMessage?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  referer?: string
  durationMs?: number
}

/**
 * Hash IP address for privacy-preserving analytics
 */
function hashIpAddress(ipAddress: string): string {
  const salt = process.env.IP_SALT || 'default-salt-change-in-production'
  return crypto
    .createHash('sha256')
    .update(ipAddress + salt)
    .digest('hex')
}

/**
 * Sanitize metadata to remove sensitive information
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = { ...metadata }
  
  // Remove sensitive keys
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'apiKey',
    'api_key',
    'token',
    'secret',
    'klaviyoApiKey',
    'klaviyoApiKeyEncrypted',
    'encryptionKey',
  ]
  
  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]'
    }
  }
  
  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value)
    }
  }
  
  return sanitized
}

/**
 * Log an audit event
 */
export async function auditLog(data: AuditLogData): Promise<void> {
  try {
    const sanitizedMetadata = data.metadata ? sanitizeMetadata(data.metadata) : {}
    
    await prisma.$executeRaw`
      INSERT INTO audit_logs (
        user_id,
        session_id,
        action,
        resource,
        resource_id,
        result,
        error_message,
        metadata,
        ip_address,
        ip_address_hash,
        user_agent,
        referer,
        duration_ms
      ) VALUES (
        ${data.userId || null}::uuid,
        ${data.sessionId || null},
        ${data.action},
        ${data.resource || null},
        ${data.resourceId || null}::uuid,
        ${data.result},
        ${data.errorMessage || null},
        ${JSON.stringify(sanitizedMetadata)}::jsonb,
        ${data.ipAddress || null},
        ${data.ipAddress ? hashIpAddress(data.ipAddress) : null},
        ${data.userAgent || null},
        ${data.referer || null},
        ${data.durationMs || null}
      )
    `
  } catch (error) {
    // Never let audit logging break the main flow
    console.error('Failed to write audit log:', error)
  }
}

/**
 * Query audit logs for a user
 */
export async function getAuditLogs(userId: string, limit = 100) {
  return prisma.$queryRaw`
    SELECT 
      id,
      action,
      resource,
      result,
      error_message,
      metadata,
      ip_address_hash,
      created_at
    FROM audit_logs
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
}

/**
 * Query failed login attempts for security monitoring
 */
export async function getFailedLoginAttempts(
  identifier: string,  // email or IP
  windowMinutes = 60
): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count
    FROM audit_logs
    WHERE action = 'auth.login_failed'
      AND (
        metadata->>'email' = ${identifier}
        OR ip_address_hash = ${hashIpAddress(identifier)}
      )
      AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'
  `
  
  return Number(result[0]?.count || 0)
}

/**
 * Helper to create audit log with timing
 */
export class AuditTimer {
  private startTime: number
  
  constructor() {
    this.startTime = Date.now()
  }
  
  async log(data: Omit<AuditLogData, 'durationMs'>): Promise<void> {
    const durationMs = Date.now() - this.startTime
    return auditLog({ ...data, durationMs })
  }
}

/**
 * Audit decorator for async functions
 */
export function audited(action: AuditAction) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const timer = new AuditTimer()
      let result: AuditResult = 'success'
      let errorMessage: string | undefined
      
      try {
        return await originalMethod.apply(this, args)
      } catch (error: any) {
        result = 'error'
        errorMessage = error.message
        throw error
      } finally {
        await timer.log({
          action,
          result,
          errorMessage,
        })
      }
    }
    
    return descriptor
  }
}

