/**
 * Environment Variable Validation
 * 
 * This utility validates that all required environment variables are set
 * Run at startup to catch configuration issues early
 */

export type EnvironmentType = 'development' | 'staging' | 'production'

export interface EnvironmentValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

const requiredEnvVars: Record<string, boolean> = {
  // Always required
  NODE_ENV: true,
  DATABASE_URL: true,
  NEXTAUTH_URL: true,
  NEXTAUTH_SECRET: true,
  JWT_SECRET: true,

  // Production required
  NEXT_PUBLIC_SENTRY_DSN: process.env.NODE_ENV === 'production',
  SENTRY_DSN: process.env.NODE_ENV === 'production',
}

const optionalEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
]

export function validateEnvironment(): EnvironmentValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const [key, isRequired] of Object.entries(requiredEnvVars)) {
    if (isRequired && !process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`)
    }
  }

  // Check optional variables (warn if missing in production)
  if (process.env.NODE_ENV === 'production') {
    for (const key of optionalEnvVars) {
      if (!process.env[key]) {
        warnings.push(`Missing optional environment variable: ${key}`)
      }
    }
  }

  // Validate secret length
  const secretMinLength = 32

  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < secretMinLength) {
    errors.push(`NEXTAUTH_SECRET must be at least ${secretMinLength} characters`)
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < secretMinLength) {
    errors.push(`JWT_SECRET must be at least ${secretMinLength} characters`)
  }

  // Validate URLs
  if (process.env.NEXTAUTH_URL) {
    try {
      new URL(process.env.NEXTAUTH_URL)
    } catch {
      errors.push('Invalid NEXTAUTH_URL format')
    }
  }

  if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must start with postgresql://')
    }
  }

  // Validate Sentry DSN format in production
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    if (!process.env.SENTRY_DSN.includes('@')) {
      warnings.push('SENTRY_DSN format may be invalid')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

export function logValidationResults(validation: EnvironmentValidation): void {
  if (validation.errors.length > 0) {
    console.error('❌ Environment validation errors:')
    validation.errors.forEach(error => console.error(`  - ${error}`))
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Environment validation warnings:')
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`))
  }

  if (validation.isValid) {
    console.log('✅ Environment validation passed')
  }
}

export function validateEnvironmentAtStartup(): void {
  const validation = validateEnvironment()
  logValidationResults(validation)

  if (!validation.isValid) {
    throw new Error('Environment validation failed. Check logs above.')
  }
}
