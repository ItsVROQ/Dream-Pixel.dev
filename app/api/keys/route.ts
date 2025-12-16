import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateApiKey, hashApiKey } from '@/lib/auth/encryption'
import { verifyJWT } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const payload = verifyJWT(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    where: { userId: payload.userId, revokedAt: null },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      type: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(keys)
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const payload = verifyJWT(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, type = 'live' } = body

    if (!['live', 'test'].includes(type)) {
      return NextResponse.json({ error: 'Invalid key type' }, { status: 400 })
    }

    // Check user tier for live keys? (Maybe limit number of keys)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Check key limit (e.g., 5 active keys)
    const count = await prisma.apiKey.count({
      where: { userId: payload.userId, revokedAt: null }
    })
    
    if (count >= 5) {
      return NextResponse.json({ error: 'Maximum number of API keys reached' }, { status: 400 })
    }

    const keyString = generateApiKey(type as 'live' | 'test')
    const keyHash = hashApiKey(keyString)

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: payload.userId,
        name: name || `${type === 'live' ? 'Live' : 'Test'} Key`,
        type,
        keyPrefix: keyString.substring(0, 8) + '...', // Store prefix with ellipsis for display? Or just prefix. Ticket said "sk_live_xxxxxxxxxxxx", usually we show "sk_live_...1234" or just "sk_live_...". I'll store "sk_live_..."
        keyHash
      }
    })

    return NextResponse.json({
      ...apiKey,
      key: keyString // Return the full key only once
    })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
