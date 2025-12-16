import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { getInvoiceS3SignedUrl } from '@/lib/s3'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const authResponse = await withAuth(request, undefined, { requireEmailVerification: true })
    if (authResponse instanceof NextResponse) return authResponse

    const authenticatedRequest = authResponse as typeof request & { user: any }
    const authUser = authenticatedRequest.user

    const invoices = await prisma.invoice.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const enriched = await Promise.all(
      invoices.map(async (invoice) => {
        const downloadUrl = invoice.s3Key
          ? await getInvoiceS3SignedUrl({ key: invoice.s3Key, expiresInSeconds: 60 * 10 })
          : invoice.pdfUrl ?? invoice.hostedInvoiceUrl

        return {
          id: invoice.id,
          stripeInvoiceId: invoice.stripeInvoiceId,
          number: invoice.number,
          status: invoice.status,
          amountPaid: invoice.amountPaid,
          currency: invoice.currency,
          hostedInvoiceUrl: invoice.hostedInvoiceUrl,
          createdAt: invoice.createdAt,
          downloadUrl,
        }
      })
    )

    return NextResponse.json({ invoices: enriched })
  } catch (error) {
    console.error('Invoices list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
