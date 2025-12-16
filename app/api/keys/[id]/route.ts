import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth/jwt'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const payload = verifyJWT(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const key = await prisma.apiKey.findUnique({
      where: { id: params.id }
    })

    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    if (key.userId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.apiKey.update({
      where: { id: params.id },
      data: { revokedAt: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
