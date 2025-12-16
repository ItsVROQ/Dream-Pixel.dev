import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Prisma, SubscriptionStatus } from '@prisma/client'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import {
  sendEmail,
  generateSubscriptionUpdateEmailHtml,
  generateWelcomeEmailHtml,
  generatePaymentReceiptEmailHtml,
  generatePaymentFailedEmailHtml,
} from '@/lib/auth/email'
import { isInvoiceS3Enabled, uploadInvoicePdfToS3 } from '@/lib/s3'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRO_CREDITS_PER_PERIOD = 100
const FREE_CREDITS_PER_PERIOD = 10

function stripeStatusToDbStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'TRIALING'
    case 'active':
      return 'ACTIVE'
    case 'past_due':
      return 'PAST_DUE'
    case 'canceled':
      return 'CANCELED'
    case 'unpaid':
      return 'UNPAID'
    case 'incomplete':
    case 'incomplete_expired':
      return 'INCOMPLETE'
    default:
      return 'INACTIVE'
  }
}

async function recordEventOnce(event: Stripe.Event): Promise<boolean> {
  try {
    await prisma.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
        stripeCreatedAt: new Date(event.created * 1000),
      },
    })

    return true
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false
    }

    throw error
  }
}

async function uploadInvoicePdf(params: { userId: string; stripeInvoiceId: string; invoicePdfUrl: string }) {
  if (!isInvoiceS3Enabled()) {
    return { s3Key: null as string | null }
  }

  const res = await fetch(params.invoicePdfUrl)
  if (!res.ok) {
    throw new Error(`Failed to download invoice PDF (${res.status})`)
  }

  const arrayBuffer = await res.arrayBuffer()
  const body = Buffer.from(arrayBuffer)

  const s3Key = `invoices/${params.userId}/${params.stripeInvoiceId}.pdf`
  await uploadInvoicePdfToS3({ key: s3Key, body })

  return { s3Key }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const tier = session.metadata?.tier
  const billingPeriod = session.metadata?.billingPeriod

  if (!userId || !tier) return

  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const stripeSubscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

  if (!stripeCustomerId || !stripeSubscriptionId) return

  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

  const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000)
  const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000)
  const cancelAt = stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null

  const priceId = stripeSubscription.items.data[0]?.price?.id ?? null

  await prisma.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId: priceId,
        billingPeriod: billingPeriod ?? null,
        status: stripeStatusToDbStatus(stripeSubscription.status),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAt,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
      update: {
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId: priceId,
        billingPeriod: billingPeriod ?? null,
        status: stripeStatusToDbStatus(stripeSubscription.status),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAt,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    })

    await tx.user.update({
      where: { id: userId },
      data: {
        tier: tier === 'PRO' ? 'PRO' : 'FREE',
        creditsRemaining: tier === 'PRO' ? PRO_CREDITS_PER_PERIOD : FREE_CREDITS_PER_PERIOD,
      },
    })
  })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
  if (!user) return

  await sendEmail({
    to: user.email,
    subject: 'Welcome to Dream Pixel Pro',
    html: generateWelcomeEmailHtml(user.name ?? 'there'),
  })

  await sendEmail({
    to: user.email,
    subject: 'Your subscription is active',
    html: generateSubscriptionUpdateEmailHtml(tier),
  })
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const stripeCustomerId = typeof stripeSubscription.customer === 'string' ? stripeSubscription.customer : stripeSubscription.customer.id

  const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000)
  const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000)
  const cancelAt = stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null
  const priceId = stripeSubscription.items.data[0]?.price?.id ?? null

  const subscription = await prisma.subscription.findFirst({
    where: {
      OR: [{ stripeSubscriptionId: stripeSubscription.id }, { stripeCustomerId }],
    },
  })

  if (!subscription) return

  await prisma.subscription.update({
    where: { userId: subscription.userId },
    data: {
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId,
      stripePriceId: priceId,
      status: stripeStatusToDbStatus(stripeSubscription.status),
      currentPeriodStart,
      currentPeriodEnd,
      cancelAt,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  })
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const stripeCustomerId = typeof stripeSubscription.customer === 'string' ? stripeSubscription.customer : stripeSubscription.customer.id

  const subscription = await prisma.subscription.findFirst({
    where: {
      OR: [{ stripeSubscriptionId: stripeSubscription.id }, { stripeCustomerId }],
    },
  })

  if (!subscription) return

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { userId: subscription.userId },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: false,
        cancelAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    })

    await tx.user.update({
      where: { id: subscription.userId },
      data: {
        tier: 'FREE',
        creditsRemaining: FREE_CREDITS_PER_PERIOD,
      },
    })
  })
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!stripeCustomerId) return

  const orConditions: Prisma.SubscriptionWhereInput[] = [{ stripeCustomerId }]
  if (typeof invoice.subscription === 'string') {
    orConditions.push({ stripeSubscriptionId: invoice.subscription })
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      OR: orConditions,
    },
  })

  if (!subscription) return

  const user = await prisma.user.findUnique({ where: { id: subscription.userId }, select: { id: true, email: true, name: true, tier: true } })
  if (!user) return

  let s3Key: string | null = null
  const pdfUrl: string | null = (invoice.invoice_pdf as string | null) ?? null

  if (invoice.invoice_pdf && isInvoiceS3Enabled()) {
    const uploaded = await uploadInvoicePdf({
      userId: user.id,
      stripeInvoiceId: invoice.id,
      invoicePdfUrl: invoice.invoice_pdf,
    })
    s3Key = uploaded.s3Key
  }

  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      userId: user.id,
      stripeInvoiceId: invoice.id,
      stripeCustomerId,
      stripeSubscriptionId: typeof invoice.subscription === 'string' ? invoice.subscription : null,
      number: invoice.number,
      status: invoice.status,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      pdfUrl,
      s3Key,
    },
    update: {
      number: invoice.number,
      status: invoice.status,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      pdfUrl,
      s3Key,
    },
  })

  if (typeof invoice.subscription === 'string') {
    const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription)

    await prisma.subscription.update({
      where: { userId: subscription.userId },
      data: {
        status: stripeStatusToDbStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        cancelAt: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null,
      },
    })
  }

  if (user.tier === 'PRO') {
    await prisma.user.update({
      where: { id: user.id },
      data: { creditsRemaining: PRO_CREDITS_PER_PERIOD },
    })
  }

  await sendEmail({
    to: user.email,
    subject: 'Payment receipt - Dream Pixel',
    html: generatePaymentReceiptEmailHtml({
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      invoiceNumber: invoice.number,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    }),
  })
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!stripeCustomerId) return

  const subscription = await prisma.subscription.findFirst({ where: { stripeCustomerId } })
  if (!subscription) return

  await prisma.subscription.update({
    where: { userId: subscription.userId },
    data: { status: 'PAST_DUE' },
  })

  const user = await prisma.user.findUnique({ where: { id: subscription.userId }, select: { email: true } })
  if (!user) return

  const nextPaymentAttempt = invoice.next_payment_attempt
    ? new Date(invoice.next_payment_attempt * 1000)
    : null

  await sendEmail({
    to: user.email,
    subject: 'Payment failed - action required',
    html: generatePaymentFailedEmailHtml({
      invoiceNumber: invoice.number,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      nextPaymentAttempt,
    }),
  })
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook secret not configured' }, { status: 500 })
  }

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  const rawBody = await request.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const shouldProcess = await recordEventOnce(event)
    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
