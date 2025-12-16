import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { stripe, getRequestIdempotencyKey } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const authResponse = await withAuth(request, undefined, { requireEmailVerification: true })
    if (authResponse instanceof NextResponse) return authResponse

    const authenticatedRequest = authResponse as typeof request & { user: any }
    const authUser = authenticatedRequest.user

    const subscription = await prisma.subscription.findUnique({ where: { userId: authUser.userId } })

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    const idempotencyKey = getRequestIdempotencyKey(request, `stripe:subscription:cancel:${authUser.userId}`)

    const updated = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true },
      { idempotencyKey }
    )

    await prisma.subscription.update({
      where: { userId: authUser.userId },
      data: {
        cancelAtPeriodEnd: updated.cancel_at_period_end,
        cancelAt: updated.cancel_at ? new Date(updated.cancel_at * 1000) : null,
        status: updated.status === 'canceled' ? 'CANCELED' : subscription.status,
      },
    })

    return NextResponse.json({ message: 'Subscription will cancel at period end' })
  } catch (error) {
    console.error('Subscription cancel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
