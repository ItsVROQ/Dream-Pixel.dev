import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user, apiKey } = auth
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  if (apiKey.type === 'test') {
    return NextResponse.json({
      items: Array.from({ length: limit }).map((_, i) => ({
        id: `gen_mock_${i + offset}`,
        status: 'SUCCEEDED',
        prompt: `Test generation ${i + offset}`,
        createdAt: new Date().toISOString()
      })),
      total: 100
    })
  }

  const [items, total] = await Promise.all([
    prisma.generation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        status: true,
        resultImageUrl: true,
        createdAt: true,
        prompt: true
      }
    }),
    prisma.generation.count({ where: { userId: user.id } })
  ])

  return NextResponse.json({ items, total })
}
