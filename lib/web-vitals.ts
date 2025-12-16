import * as Sentry from '@sentry/nextjs'

export interface WebVitals {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
  entries: PerformanceEntry[]
}

const vitalsThresholds = {
  LCP: {
    good: 2500,
    'needs-improvement': 4000,
  },
  FID: {
    good: 100,
    'needs-improvement': 300,
  },
  CLS: {
    good: 0.1,
    'needs-improvement': 0.25,
  },
  FCP: {
    good: 1800,
    'needs-improvement': 3000,
  },
  TTFB: {
    good: 600,
    'needs-improvement': 1200,
  },
}

export function getRating(metricName: string, value: number): WebVitals['rating'] {
  const thresholds = vitalsThresholds[metricName as keyof typeof vitalsThresholds]
  
  if (!thresholds) return 'needs-improvement'
  
  if (value <= thresholds.good) return 'good'
  if (value <= thresholds['needs-improvement']) return 'needs-improvement'
  return 'poor'
}

export function reportWebVitals(metric: WebVitals): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`${metric.name}:`, {
      value: metric.value.toFixed(2),
      rating: metric.rating,
      delta: metric.delta.toFixed(2),
    })
  }

  // Send to Sentry
  Sentry.addBreadcrumb({
    category: 'web-vitals',
    message: metric.name,
    level: metric.rating === 'good' ? 'info' : metric.rating === 'needs-improvement' ? 'warning' : 'error',
    data: {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    },
  })

  // Capture poor metrics as exceptions
  if (metric.rating === 'poor') {
    Sentry.captureException(new Error(`Web Vital ${metric.name} is poor: ${metric.value}`), {
      level: 'warning',
      contexts: {
        webVital: {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
        },
      },
    })
  }
}
