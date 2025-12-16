import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { encryptApiKeyForStorage } from '@/lib/auth/encryption'

const profileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  apiKey: z.boolean().optional(),
})

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

    // Get fresh user data
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        emailVerified: true,
        creditsRemaining: true,
        profilePictureUrl: true,
        createdAt: true,
        apiKey: true, // This will be encrypted
      }
    })

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        tier: userData.tier,
        emailVerified: userData.emailVerified,
        creditsRemaining: userData.creditsRemaining,
        profilePictureUrl: userData.profilePictureUrl,
        createdAt: userData.createdAt,
        hasApiKey: !!userData.apiKey,
      }
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { name, apiKey } = profileUpdateSchema.parse(body)

    const updateData: any = {}
    
    if (name !== undefined) {
      updateData.name = name
    }

    if (apiKey) {
      // Generate new API key
      const newApiKey = crypto.randomBytes(32).toString('hex')
      const encryptedApiKey = encryptApiKeyForStorage(newApiKey)
      updateData.apiKey = encryptedApiKey
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        emailVerified: true,
        creditsRemaining: true,
        profilePictureUrl: true,
        hasApiKey: true,
      }
    })

    return NextResponse.json({
      message: apiKey ? 'API key generated successfully' : 'Profile updated successfully',
      user: updatedUser,
      ...(apiKey && { apiKey: newApiKey }) // Return the plain API key only when generated
    })

  } catch (error) {
    console.error('Profile update error:', error)
    
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