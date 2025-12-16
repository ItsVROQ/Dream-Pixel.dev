import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth/jwt'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const payload = verifyJWT(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const webhooks = await prisma.webhook.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(webhooks)
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const payload = verifyJWT(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { url, events } = body

    if (!url || !events || !Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Generate a secret for HMAC
    const secret = crypto.randomBytes(32).toString('hex')

    const webhook = await prisma.webhook.create({
      data: {
        userId: payload.userId,
        url,
        events,
        secret
      }
    })

    return NextResponse.json(webhook)
  } catch (error) {
    console.error('Error creating webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
