import * as Sentry from '@sentry/nextjs'
import { logger } from './logger'

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: string
}

interface ApiMetric {
  endpoint: string
  method: string
  statusCode: number
  duration: number
  timestamp: string
  error?: string
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private apiMetrics: ApiMetric[] = []

  recordMetric(name: string, value: number, unit: string = 'ms'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
    }

    this.metrics.push(metric)

    // Send to Sentry
    Sentry.captureMessage(`Performance: ${name} = ${value}${unit}`, 'info')

    // Log if exceeds thresholds
    this.checkThresholds(metric)
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const thresholds: Record<string, number> = {
      'api.latency': 2000, // 2 seconds
      'database.query': 500, // 500ms
      'image.processing': 5000, // 5 seconds
      'cache.hit_rate': 80, // 80% is good
    }

    if (metric.name in thresholds) {
      const threshold = thresholds[metric.name]
      if (metric.value > threshold) {
        logger.warn(`Performance threshold exceeded: ${metric.name}`, {
          value: metric.value,
          threshold,
          unit: metric.unit,
        })

        Sentry.captureMessage(
          `Performance threshold exceeded: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${threshold}${metric.unit})`,
          'warning'
        )
      }
    }
  }

  recordApiCall(endpoint: string, method: string, statusCode: number, duration: number, error?: Error): void {
    const metric: ApiMetric = {
      endpoint,
      method,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
      error: error?.message,
    }

    this.apiMetrics.push(metric)

    // Check if error or slow
    if (statusCode >= 400) {
      logger.warn(`API error: ${method} ${endpoint}`, {
        statusCode,
        duration,
        error: error?.message,
      })
    } else if (duration > 2000) {
      logger.warn(`Slow API: ${method} ${endpoint}`, {
        duration,
        statusCode,
      })
    }

    // Send to Sentry
    Sentry.addBreadcrumb({
      category: 'api',
      message: `${method} ${endpoint}`,
      level: statusCode >= 400 ? 'error' : 'info',
      data: {
        statusCode,
        duration,
      },
    })
  }

  getMetrics(limit: number = 100): PerformanceMetric[] {
    return this.metrics.slice(-limit)
  }

  getApiMetrics(limit: number = 100): ApiMetric[] {
    return this.apiMetrics.slice(-limit)
  }

  getAverageApiDuration(endpoint?: string): number {
    const metrics = endpoint ? this.apiMetrics.filter(m => m.endpoint === endpoint) : this.apiMetrics

    if (metrics.length === 0) return 0

    const total = metrics.reduce((sum, m) => sum + m.duration, 0)
    return Math.round(total / metrics.length)
  }

  getErrorRate(endpoint?: string): number {
    const metrics = endpoint ? this.apiMetrics.filter(m => m.endpoint === endpoint) : this.apiMetrics

    if (metrics.length === 0) return 0

    const errors = metrics.filter(m => m.statusCode >= 400).length
    return Math.round((errors / metrics.length) * 100)
  }

  clearMetrics(): void {
    this.metrics = []
    this.apiMetrics = []
  }
}

export const performanceMonitor = new PerformanceMonitor()

// Middleware to track API performance
export function createPerformanceMiddleware() {
  return (request: Request, handler: () => Promise<Response>) => {
    const startTime = Date.now()
    const url = new URL(request.url)

    return handler()
      .then(response => {
        const duration = Date.now() - startTime
        performanceMonitor.recordApiCall(
          url.pathname,
          request.method,
          response.status,
          duration
        )
        return response
      })
      .catch(error => {
        const duration = Date.now() - startTime
        performanceMonitor.recordApiCall(
          url.pathname,
          request.method,
          500,
          duration,
          error as Error
        )
        throw error
      })
  }
}
