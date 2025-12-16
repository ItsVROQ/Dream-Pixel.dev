/**
 * Instrumentation file that runs at server startup
 * Used for one-time initialization tasks
 */

import { validateEnvironmentAtStartup } from '@/lib/validate-env'
import { logger } from '@/lib/logger'

export async function register() {
  try {
    // Validate environment variables at startup
    validateEnvironmentAtStartup()

    logger.info('Application starting', {
      environment: process.env.APP_ENV || process.env.NODE_ENV,
      version: process.env.npm_package_version,
    })

    // Initialize Sentry in Edge Runtime if needed
    if (process.env.NEXT_RUNTIME === 'edge') {
      // Edge runtime initialization if needed
    }
  } catch (error) {
    logger.error('Failed to initialize application', error instanceof Error ? error : new Error(String(error)))
    // Don't crash the app on startup, just log the error
  }
}
