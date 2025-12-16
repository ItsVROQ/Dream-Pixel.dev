import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { stripe, getBaseUrl, getRequestIdempotencyKey, getStripePriceId } from '@/lib/stripe'

export const runtime = 'nodejs'

const createCheckoutSessionSchema = z.object({
  user_id: z.string().min(1),
  tier: z.enum(['PRO', 'ENTERPRISE']),
  billing_period: z.enum(['month', 'year']),
})

export async function POST(request: NextRequest) {
  try {
    const authResponse = await withAuth(request, undefined, { requireEmailVerification: true })
    if (authResponse instanceof NextResponse) return authResponse

    const authenticatedRequest = authResponse as typeof request & { user: any }
    const authUser = authenticatedRequest.user

    const body = await request.json()
    const { user_id, tier, billing_period } = createCheckoutSessionSchema.parse(body)

    if (authUser.userId !== user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (tier === 'ENTERPRISE') {
      return NextResponse.json(
        { error: 'Enterprise plans are custom. Please contact sales.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, email: true, name: true, tier: true, subscription: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existingSubscription = user.subscription
    if (
      existingSubscription?.stripeSubscriptionId &&
      ['ACTIVE', 'TRIALING', 'PAST_DUE', 'INCOMPLETE'].includes(existingSubscription.status)
    ) {
      return NextResponse.json(
        { error: 'User already has a subscription' },
        { status: 409 }
      )
    }

    const baseUrl = getBaseUrl()
    const successUrl = new URL('/dashboard?success=true', baseUrl).toString()
    const cancelUrl = new URL('/pricing?canceled=true', baseUrl).toString()

    const stripePriceId = getStripePriceId('PRO', billing_period)

    const subscriptionRecord = await prisma.subscription.upsert({
      where: { userId: user_id },
      create: {
        userId: user_id,
        status: 'INACTIVE',
      },
      update: {},
    })

    let stripeCustomerId = subscriptionRecord.stripeCustomerId

    if (!stripeCustomerId) {
      const idempotencyKey = getRequestIdempotencyKey(request, `stripe:customer:create:${user_id}`)
      const customer = await stripe.customers.create(
        {
          email: user.email,
          name: user.name ?? undefined,
          metadata: {
            userId: user_id,
          },
        },
        { idempotencyKey }
      )

      stripeCustomerId = customer.id

      await prisma.subscription.update({
        where: { userId: user_id },
        data: { stripeCustomerId },
      })
    }

    const idempotencyKey = getRequestIdempotencyKey(
      request,
      `stripe:checkout:create:${user_id}:${tier}:${billing_period}`
    )

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: stripeCustomerId,
        client_reference_id: user_id,
        line_items: [{ price: stripePriceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: user_id,
          tier,
          billingPeriod: billing_period,
        },
        subscription_data: {
          metadata: {
            userId: user_id,
            tier,
            billingPeriod: billing_period,
          },
        },
      },
      { idempotencyKey }
    )

    return NextResponse.json({ id: session.id, url: session.url })
  } catch (error) {
    console.error('Create checkout session error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
