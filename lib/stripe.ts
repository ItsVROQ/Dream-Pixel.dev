import Stripe from 'stripe'
import crypto from 'crypto'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  typescript: true,
})

export type BillingPeriod = 'month' | 'year'

export function getBaseUrl() {
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
}

export function getStripePriceId(tier: 'PRO', billingPeriod: BillingPeriod): string {
  if (tier !== 'PRO') {
    throw new Error(`Unsupported tier: ${tier}`)
  }

  const priceId =
    billingPeriod === 'month'
      ? process.env.STRIPE_PRICE_PRO_MONTHLY
      : process.env.STRIPE_PRICE_PRO_YEARLY

  if (!priceId) {
    throw new Error(`Missing Stripe price id env var for ${tier} ${billingPeriod}`)
  }

  return priceId
}

export function getRequestIdempotencyKey(request: Request, seed: string): string {
  const headerKey = request.headers.get('idempotency-key') ?? request.headers.get('x-idempotency-key')
  if (headerKey) return headerKey

  const timeBucket = Math.floor(Date.now() / (1000 * 60 * 5))
  return crypto.createHash('sha256').update(`${seed}:${timeBucket}`).digest('hex')
}
