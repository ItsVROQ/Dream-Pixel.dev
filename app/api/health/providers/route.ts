import { NextRequest, NextResponse } from 'next/server'
import { getAllProviders, getProviderNames } from '@/lib/providers/factory'

export async function GET(request: NextRequest) {
  try {
    const providers = getAllProviders()
    const providerStatuses: Record<string, any> = {}

    // Check health of each provider in parallel
    const healthChecks = providers.map(async provider => {
      try {
        const healthy = await Promise.race([
          provider.isHealthy(),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ])

        return {
          name: provider.name,
          healthy,
          status: healthy ? 'operational' : 'degraded',
          lastCheck: new Date().toISOString()
        }
      } catch (error) {
        return {
          name: provider.name,
          healthy: false,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString()
        }
      }
    })

    const results = await Promise.all(healthChecks)

    // Build response
    const allHealthy = results.every(r => r.healthy)

    results.forEach(result => {
      providerStatuses[result.name] = result
    })

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      providers: providerStatuses,
      timestamp: new Date().toISOString(),
      configured: {
        gemini: !!process.env.GEMINI_API_KEY,
        stability: !!process.env.STABILITY_API_KEY,
        replicate: !!process.env.REPLICATE_API_KEY,
      }
    })

  } catch (error) {
    console.error('Provider health check error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
