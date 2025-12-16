import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const seeds = await prisma.seed.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
        creator: {
            select: { name: true }
        }
    }
  })

  return NextResponse.json(seeds)
}

const seedSchema = z.object({
  seedNumber: z.number(),
  title: z.string(),
  category: z.enum(['PORTRAIT', 'LANDSCAPE', 'ANIME', 'ABSTRACT', 'OTHER']),
  description: z.string().optional()
})

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user, apiKey } = auth

  // Check tier
  if (user.tier === 'FREE') {
    return NextResponse.json({ error: 'Pro tier required' }, { status: 403 })
  }

  if (apiKey.type === 'test') {
    return NextResponse.json({ success: true, mock: true }, { status: 201 })
  }

  try {
    const body = await request.json()
    const data = seedSchema.parse(body)

    const seed = await prisma.seed.create({
      data: {
        ...data,
        creatorId: user.id
      }
    })

    return NextResponse.json(seed, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
