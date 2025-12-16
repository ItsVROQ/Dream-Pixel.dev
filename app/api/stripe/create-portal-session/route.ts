import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { stripe, getBaseUrl, getRequestIdempotencyKey } from '@/lib/stripe'

export const runtime = 'nodejs'

const createPortalSessionSchema = z.object({
  user_id: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const authResponse = await withAuth(request, undefined, { requireEmailVerification: true })
    if (authResponse instanceof NextResponse) return authResponse

    const authenticatedRequest = authResponse as typeof request & { user: any }
    const authUser = authenticatedRequest.user

    const body = await request.json()
    const { user_id } = createPortalSessionSchema.parse(body)

    if (authUser.userId !== user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const subscription = await prisma.subscription.findUnique({ where: { userId: user_id } })

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this user' },
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl()
    const returnUrl = new URL('/dashboard', baseUrl).toString()

    const idempotencyKey = getRequestIdempotencyKey(request, `stripe:portal:create:${user_id}`)

    const session = await stripe.billingPortal.sessions.create(
      {
        customer: subscription.stripeCustomerId,
        return_url: returnUrl,
      },
      { idempotencyKey }
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Create portal session error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
