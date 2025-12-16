import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateUsageWarningEmailHtml } from '@/lib/auth/email'

export const runtime = 'nodejs'

function getMonthPeriod(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0))
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0))
  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const authResponse = await withAuth(request, undefined, { requireEmailVerification: true })
    if (authResponse instanceof NextResponse) return authResponse

    const authenticatedRequest = authResponse as typeof request & { user: any }
    const authUser = authenticatedRequest.user

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, email: true, tier: true, subscription: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const now = new Date()

    const periodStart = user.subscription?.currentPeriodStart ?? getMonthPeriod(now).start
    const periodEnd = user.subscription?.currentPeriodEnd ?? getMonthPeriod(now).end

    const used = await prisma.generation.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    })

    const limit =
      user.tier === 'FREE'
        ? 10
        : user.subscription?.generationLimit
          ? user.subscription.generationLimit
          : 'unlimited'

    if (
      user.tier === 'ENTERPRISE' &&
      user.subscription &&
      typeof limit === 'number' &&
      limit > 0 &&
      used >= Math.ceil(limit * 0.8) &&
      !user.subscription.usageWarningSentAt
    ) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { usageWarningSentAt: new Date() },
      })

      await sendEmail({
        to: user.email,
        subject: 'Dream Pixel usage warning',
        html: generateUsageWarningEmailHtml({ used, limit }),
      })
    }

    return NextResponse.json({
      tier: user.tier,
      periodStart,
      periodEnd,
      used,
      limit,
    })
  } catch (error) {
    console.error('Subscription usage error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
