import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/adminMiddleware'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        subscription: true,
        generations: {
          take: 20,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            generations: true,
            seeds: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Remove sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, resetToken, resetTokenExpiry, verificationToken, apiKey, ...safeUser } = user

    return NextResponse.json(safeUser)

  } catch (error) {
    console.error('Failed to fetch user details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { tier, status, creditsRemaining, resetPassword } = body

    const updateData: Record<string, unknown> = {}

    if (tier) updateData.tier = tier
    if (status) updateData.status = status
    if (typeof creditsRemaining === 'number') updateData.creditsRemaining = creditsRemaining

    // Reset password if requested
    if (resetPassword) {
      const newPassword = Math.random().toString(36).slice(-10)
      updateData.passwordHash = await hashPassword(newPassword)
      // In production, send email with new password
      console.log(`Password reset for user ${params.id}: ${newPassword}`)
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        status: true,
        creditsRemaining: true
      }
    })

    return NextResponse.json(user)

  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    // Prevent deleting the current admin
    if (authResult.user.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
