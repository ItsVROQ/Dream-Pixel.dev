import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { stripe, getRequestIdempotencyKey, getStripePriceId } from '@/lib/stripe'

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

    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
    const item = stripeSubscription.items.data[0]

    if (!item) {
      return NextResponse.json({ error: 'Subscription item not found' }, { status: 400 })
    }

    const currentInterval = item.price.recurring?.interval
    if (currentInterval === 'year') {
      return NextResponse.json({ error: 'Already on yearly billing' }, { status: 409 })
    }

    const yearlyPriceId = getStripePriceId('PRO', 'year')
    const idempotencyKey = getRequestIdempotencyKey(request, `stripe:subscription:upgrade:${authUser.userId}`)

    const updated = await stripe.subscriptions.update(
      stripeSubscription.id,
      {
        items: [{ id: item.id, price: yearlyPriceId }],
        proration_behavior: 'create_prorations',
      },
      { idempotencyKey }
    )

    await prisma.subscription.update({
      where: { userId: authUser.userId },
      data: {
        stripePriceId: yearlyPriceId,
        billingPeriod: 'year',
        currentPeriodStart: new Date(updated.current_period_start * 1000),
        currentPeriodEnd: new Date(updated.current_period_end * 1000),
        cancelAtPeriodEnd: updated.cancel_at_period_end,
        cancelAt: updated.cancel_at ? new Date(updated.cancel_at * 1000) : null,
      },
    })

    return NextResponse.json({ message: 'Subscription upgraded to yearly billing' })
  } catch (error) {
    console.error('Subscription upgrade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
