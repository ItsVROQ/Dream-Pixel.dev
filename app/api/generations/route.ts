import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const generateImageSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(500, 'Prompt too long'),
  negativePrompt: z.string().optional(),
  settings: z.object({
    quality: z.enum(['standard', 'high']).default('standard'),
    style: z.string().optional(),
    aspectRatio: z.string().optional(),
  }).default({}),
})

export async function POST(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResponse = await withAuth(request, undefined, {
      requireEmailVerification: true
    })

    // If auth failed, return the error response
    if (authResponse instanceof NextResponse) {
      return authResponse
    }

    const authenticatedRequest = authResponse as typeof request & { user: any }
    
    const body = await request.json()
    const { prompt, negativePrompt, settings } = generateImageSchema.parse(body)
    const user = authenticatedRequest.user

    // Check if user has credits
    if (user.creditsRemaining <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan or wait for credit refresh.' },
        { status: 402 }
      )
    }

    // Check feature access based on user tier
    const requiredCredits = settings.quality === 'high' ? 2 : 1
    const feature = settings.quality === 'high' ? 'high_quality' : 'basic_generation'

    // This would be replaced with actual image generation logic
    // For now, we'll simulate the process
    
    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: user.userId,
        prompt,
        negativePrompt,
        settings,
        status: 'PENDING',
      }
    })

    // Deduct credits
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        creditsRemaining: {
          decrement: requiredCredits
        }
      }
    })

    // Simulate async generation process (in real implementation, this would be a queue)
    // For demo purposes, we'll immediately return a "processing" status
    
    return NextResponse.json({
      message: 'Generation started',
      generation: {
        id: generation.id,
        status: generation.status,
        prompt: generation.prompt,
        estimatedTime: settings.quality === 'high' ? '30-60 seconds' : '10-30 seconds',
        creditsUsed: requiredCredits,
        creditsRemaining: user.creditsRemaining - requiredCredits,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResponse = await withAuth(request, undefined, {
      requireEmailVerification: true
    })

    if (authResponse instanceof NextResponse) {
      return authResponse
    }

    const authenticatedRequest = authResponse as typeof request & { user: any }
    const user = authenticatedRequest.user

    // Get user's generations
    const generations = await prisma.generation.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50 generations
      select: {
        id: true,
        prompt: true,
        status: true,
        resultImageUrl: true,
        createdAt: true,
        processingTimeMs: true,
      }
    })

    return NextResponse.json({
      generations,
      user: {
        creditsRemaining: user.creditsRemaining,
        tier: user.tier,
      }
    })

  } catch (error) {
    console.error('Fetch generations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}