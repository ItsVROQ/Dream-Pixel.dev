import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT, JWTPayload } from '@/lib/auth/jwt'
import { isAccountLocked } from '@/lib/auth/rateLimit'
import { prisma } from '@/lib/prisma'

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload & {
    emailVerified: boolean
    creditsRemaining: number
  }
}

export async function withAuth(
  request: NextRequest,
  requiredTier?: 'FREE' | 'PRO' | 'ENTERPRISE',
  options?: {
    requireEmailVerification?: boolean
  }
) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Check if account is locked
    const lockStatus = await isAccountLocked(payload.userId)
    if (lockStatus.locked) {
      return NextResponse.json(
        { error: `Account locked until ${new Date(lockStatus.until!).toLocaleString()}` },
        { status: 423 }
      )
    }

    // Get fresh user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        emailVerified: true,
        creditsRemaining: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check email verification requirement
    if (options?.requireEmailVerification && !user.emailVerified) {
      return NextResponse.json(
        { error: 'Email verification required' },
        { status: 403 }
      )
    }

    // Check tier requirement
    if (requiredTier) {
      const tierHierarchy = { FREE: 0, PRO: 1, ENTERPRISE: 2 }
      const userTierLevel = tierHierarchy[user.tier as keyof typeof tierHierarchy]
      const requiredTierLevel = tierHierarchy[requiredTier]

      if (userTierLevel < requiredTierLevel) {
        return NextResponse.json(
          { error: `${requiredTier} tier access required` },
          { status: 403 }
        )
      }
    }

    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = {
      ...payload,
      emailVerified: user.emailVerified,
      creditsRemaining: user.creditsRemaining,
    }

    return authenticatedRequest

  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    )
  }
}

export function checkFeatureAccess(userTier: string, feature: string): boolean {
  const featureAccess = {
    FREE: [
      'basic_generation',
      'standard_quality',
    ],
    PRO: [
      'basic_generation',
      'standard_quality',
      'high_quality',
      'priority_processing',
      'advanced_settings',
    ],
    ENTERPRISE: [
      'basic_generation',
      'standard_quality',
      'high_quality',
      'priority_processing',
      'advanced_settings',
      'api_access',
      'team_collaboration',
      'unlimited_generations',
    ]
  }

  return featureAccess[userTier as keyof typeof featureAccess]?.includes(feature) || false
}