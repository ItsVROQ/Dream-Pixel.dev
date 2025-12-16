import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const generateSchema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  seed: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  steps: z.number().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user, apiKey } = auth

  try {
    const body = await request.json()
    const { prompt, negativePrompt, seed, width, height, steps } = generateSchema.parse(body)

    if (apiKey.type === 'test') {
       // Return mock response immediately
       return NextResponse.json({
         id: 'gen_mock_' + Date.now(),
         status: 'SUCCEEDED',
         resultImageUrl: 'https://placehold.co/1024x1024.png?text=Dream+Pixel+Mock',
         createdAt: new Date().toISOString(),
         mock: true
       })
    }

    // Check credits
    if (user.creditsRemaining <= 0) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
    }

    const generation = await prisma.generation.create({
      data: {
        userId: user.id,
        prompt,
        negativePrompt,
        seed,
        settings: { width, height, steps }, 
        status: 'PENDING'
      }
    })

    // Deduct credits
    await prisma.user.update({
      where: { id: user.id },
      data: { creditsRemaining: { decrement: 1 } }
    })

    // In a real system, we'd enqueue a job here.
    // And also check for webhooks to fire "generation.created" if applicable.

    return NextResponse.json({
      id: generation.id,
      status: generation.status,
      createdAt: generation.createdAt
    })

  } catch (error) {
     if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
