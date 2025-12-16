import { NextResponse } from 'next/server'
import { getProviderNames } from '@/lib/providers/factory'
import { UserTier } from '@prisma/client'

export async function GET() {
  try {
    const providers = getProviderNames()

    // Rate limit tiers
    const rateLimits = {
      FREE: {
        limit: parseInt(process.env.GENERATION_FREE_TIER_LIMIT || '1'),
        window: parseInt(process.env.GENERATION_FREE_TIER_WINDOW || '86400'),
        windowLabel: 'per day'
      },
      PRO: {
        limit: parseInt(process.env.GENERATION_PRO_TIER_LIMIT || '100'),
        window: parseInt(process.env.GENERATION_PRO_TIER_WINDOW || '86400'),
        windowLabel: 'per day'
      },
      ENTERPRISE: {
        limit: parseInt(process.env.GENERATION_ENTERPRISE_TIER_LIMIT || '1000'),
        window: parseInt(process.env.GENERATION_ENTERPRISE_TIER_WINDOW || '86400'),
        windowLabel: 'per day'
      }
    }

    return NextResponse.json({
      providers: {
        available: providers,
        default: process.env.AI_PROVIDER || 'gemini'
      },
      rateLimits,
      generation: {
        maxRetries: parseInt(process.env.GENERATION_MAX_RETRIES || '3'),
        timeoutSeconds: parseInt(process.env.GENERATION_TIMEOUT_SECONDS || '300'),
        providerTimeoutSeconds: parseInt(process.env.GENERATION_PROVIDER_TIMEOUT_SECONDS || '60')
      },
      settings: {
        width: { min: 256, max: 2048, default: 512 },
        height: { min: 256, max: 2048, default: 512 },
        guidance_scale: { min: 1, max: 20, default: 7.5 },
        steps: { min: 10, max: 150, default: 50 },
        num_variations: { min: 1, max: 4, default: 1 },
        format: { options: ['png', 'jpeg', 'webp'], default: 'png' }
      }
    })
  } catch (error) {
    console.error('Generation info error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
