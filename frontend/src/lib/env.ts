/**
 * Environment Variable Validation
 * Validates and provides type-safe access to environment variables
 */

type EnvConfig = {
  // Application
  NODE_ENV: 'development' | 'production' | 'test'
  
  // Database
  DATABASE_URL: string
  
  // Redis
  REDIS_URL: string
  
  // Auth
  NEXTAUTH_URL: string
  NEXTAUTH_SECRET: string
  
  // Encryption
  ENCRYPTION_KEY: string
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number
  RATE_LIMIT_MAX_REQUESTS: number
  LOGIN_RATE_LIMIT_WINDOW_MS: number
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: number
  
  // Security
  MAX_FAILED_LOGIN_ATTEMPTS: number
  ACCOUNT_LOCKOUT_DURATION_MINUTES: number
  
  // Optional
  KLAVIYO_API_BASE_URL?: string
  LOG_LEVEL?: string
  SENTRY_DSN?: string
  ALLOWED_ORIGINS?: string
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key]
  
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  
  return value || defaultValue!
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key]
  
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  
  const parsed = parseInt(value || String(defaultValue), 10)
  
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`)
  }
  
  return parsed
}

/**
 * Validate all required environment variables on startup
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = []
  
  try {
    // Required variables
    const requiredVars = [
      'DATABASE_URL',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'ENCRYPTION_KEY',
    ]
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`)
      }
    }
    
    // Validate NEXTAUTH_SECRET length (should be at least 32 characters)
    const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim()
    if (nextAuthSecret && nextAuthSecret.length < 32) {
      errors.push(`NEXTAUTH_SECRET must be at least 32 characters long (current: ${nextAuthSecret.length})`)
    }
    
    // Validate ENCRYPTION_KEY length (should be at least 32 characters)
    const encryptionKey = process.env.ENCRYPTION_KEY?.trim()
    if (encryptionKey && encryptionKey.length < 32) {
      errors.push(`ENCRYPTION_KEY must be at least 32 characters long (current: ${encryptionKey.length} characters)`)
      errors.push(`  Tip: Run "openssl rand -hex 32" to generate a 64-character key`)
    }
    
    // Validate DATABASE_URL format
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection string')
    }
    
    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`)
    }
    
    return {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      DATABASE_URL: getEnvVar('DATABASE_URL'),
      REDIS_URL: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
      NEXTAUTH_URL: getEnvVar('NEXTAUTH_URL'),
      NEXTAUTH_SECRET: getEnvVar('NEXTAUTH_SECRET'),
      ENCRYPTION_KEY: getEnvVar('ENCRYPTION_KEY'),
      RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 min
      RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
      LOGIN_RATE_LIMIT_WINDOW_MS: getEnvNumber('LOGIN_RATE_LIMIT_WINDOW_MS', 900000),
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: getEnvNumber('LOGIN_RATE_LIMIT_MAX_ATTEMPTS', 5),
      MAX_FAILED_LOGIN_ATTEMPTS: getEnvNumber('MAX_FAILED_LOGIN_ATTEMPTS', 5),
      ACCOUNT_LOCKOUT_DURATION_MINUTES: getEnvNumber('ACCOUNT_LOCKOUT_DURATION_MINUTES', 30),
      KLAVIYO_API_BASE_URL: process.env.KLAVIYO_API_BASE_URL,
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      SENTRY_DSN: process.env.SENTRY_DSN,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    }
  } catch (error) {
    console.error('❌ Environment validation failed:', error)
    console.error('\n📝 Please check your .env file and ensure all required variables are set.')
    console.error('📄 See env.example for a template.\n')
    throw error
  }
}

// Export singleton config
let config: EnvConfig | null = null

export function getConfig(): EnvConfig {
  if (!config) {
    config = validateEnv()
  }
  return config
}

// Validate on module load in production (but NOT during build phase)
// During Docker build, the .env file isn't available yet (mounted at runtime)
const isNextBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
const isBuildTime = process.argv.includes('build') || isNextBuildPhase

if (process.env.NODE_ENV === 'production' && !isBuildTime) {
  try {
    validateEnv()
    console.log('✅ Environment variables validated successfully')
  } catch (error) {
    console.error('❌ Environment validation failed:', error)
    // In production, fail fast if env validation fails at runtime
    throw error
  }
}

