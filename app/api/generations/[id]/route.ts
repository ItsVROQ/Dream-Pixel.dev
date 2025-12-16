import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const generationId = params.id

    // Get generation record
    const generation = await prisma.generation.findFirst({
      where: {
        id: generationId,
        userId: user.userId
      },
      select: {
        id: true,
        userId: true,
        prompt: true,
        negativePrompt: true,
        seed: true,
        referenceImageUrl: true,
        resultImageUrl: true,
        settings: true,
        status: true,
        errorMessage: true,
        processingTimeMs: true,
        provider: true,
        jobId: true,
        retryCount: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    // Calculate progress based on status and time elapsed
    let progress = 0
    switch (generation.status) {
      case 'PENDING':
        progress = 5
        break
      case 'PROCESSING':
        progress = 50
        break
      case 'SUCCEEDED':
        progress = 100
        break
      case 'FAILED':
        progress = 0
        break
    }

    return NextResponse.json({
      generation: {
        id: generation.id,
        prompt: generation.prompt,
        negativePrompt: generation.negativePrompt,
        seed: generation.seed,
        referenceImageUrl: generation.referenceImageUrl,
        resultImageUrl: generation.resultImageUrl,
        settings: generation.settings,
        status: generation.status,
        errorMessage: generation.errorMessage,
        processingTimeMs: generation.processingTimeMs,
        provider: generation.provider,
        retryCount: generation.retryCount,
        progress,
        createdAt: generation.createdAt,
        completedAt: generation.completedAt,
        updatedAt: generation.updatedAt,
      }
    })

  } catch (error) {
    console.error('Get generation status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
