import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { checkFeatureAccess } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResponse = await withAuth(request, undefined, {
      requireEmailVerification: true
    })

    if (authResponse instanceof NextResponse) {
      return authResponse
    }

    const authenticatedRequest = authResponse as typeof request & { user: any }
    const user = authenticatedRequest.user

    // Check what features are available for this user
    const features = {
      basic_generation: checkFeatureAccess(user.tier, 'basic_generation'),
      high_quality: checkFeatureAccess(user.tier, 'high_quality'),
      priority_processing: checkFeatureAccess(user.tier, 'priority_processing'),
      advanced_settings: checkFeatureAccess(user.tier, 'advanced_settings'),
      api_access: checkFeatureAccess(user.tier, 'api_access'),
      team_collaboration: checkFeatureAccess(user.tier, 'team_collaboration'),
      unlimited_generations: checkFeatureAccess(user.tier, 'unlimited_generations'),
    }

    return NextResponse.json({
      message: 'Authenticated request successful',
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
        tier: user.tier,
        creditsRemaining: user.creditsRemaining,
        emailVerified: user.emailVerified,
      },
      features,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Protected endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}