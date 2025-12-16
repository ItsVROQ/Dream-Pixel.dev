import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { inngest } from '@/lib/inngest/client'
import { validateGenerationRequest, calculateRequiredCredits, getEstimatedProcessingTime } from '@/lib/generation/utils'
import { checkGenerationRateLimit } from '@/lib/generation/rateLimit'
import { z } from 'zod'

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
    const user = authenticatedRequest.user

    // Parse and validate request body
    const body = await request.json()
    const generationRequest = validateGenerationRequest(body)

    // Check rate limit
    const rateLimit = await checkGenerationRateLimit(user.userId, user.tier)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded for your tier (${user.tier}). Reset at ${rateLimit.resetTime.toISOString()}`,
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        },
        { status: 429 }
      )
    }

    // Calculate required credits
    const requiredCredits = calculateRequiredCredits(user.tier, generationRequest.settings)

    // Check if user has sufficient credits
    if (user.creditsRemaining < requiredCredits) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Required: ${requiredCredits}, Available: ${user.creditsRemaining}`,
          creditsRequired: requiredCredits,
          creditsAvailable: user.creditsRemaining
        },
        { status: 402 }
      )
    }

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: user.userId,
        prompt: generationRequest.prompt,
        negativePrompt: generationRequest.negativePrompt,
        seed: generationRequest.seed,
        referenceImageUrl: generationRequest.referenceImageUrl,
        settings: generationRequest.settings,
        provider: generationRequest.provider || process.env.AI_PROVIDER || 'gemini',
        status: 'PENDING',
      }
    })

    // Queue background job with Inngest
    const jobResult = await inngest.send({
      name: 'generation/image.create',
      data: {
        generationId: generation.id,
        userId: user.userId,
        prompt: generationRequest.prompt,
        negativePrompt: generationRequest.negativePrompt,
        seed: generationRequest.seed,
        referenceImageUrl: generationRequest.referenceImageUrl,
        settings: generationRequest.settings,
        providerName: generationRequest.provider || process.env.AI_PROVIDER || 'gemini'
      }
    })

    // Decrement credits immediately (optimistic deduction)
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        creditsRemaining: {
          decrement: requiredCredits
        }
      }
    })

    const estimatedTime = getEstimatedProcessingTime(generationRequest.settings)

    return NextResponse.json({
      jobId: generation.id,
      status: generation.status,
      prompt: generationRequest.prompt,
      estimatedProcessingTime: estimatedTime,
      creditsUsed: requiredCredits,
      creditsRemaining: user.creditsRemaining - requiredCredits,
      createdAt: generation.createdAt,
    }, { status: 202 })

  } catch (error) {
    console.error('Generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        },
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
      take: 50,
      select: {
        id: true,
        prompt: true,
        status: true,
        resultImageUrl: true,
        errorMessage: true,
        createdAt: true,
        completedAt: true,
        processingTimeMs: true,
        provider: true,
        retryCount: true,
      }
    })

    return NextResponse.json({
      generations,
      pagination: {
        total: generations.length,
        limit: 50
      },
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