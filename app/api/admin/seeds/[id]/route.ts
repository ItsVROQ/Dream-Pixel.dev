import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/adminMiddleware'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { isFeatured, isApproved, isBanned } = body

    const updateData: Record<string, unknown> = {}

    if (typeof isFeatured === 'boolean') updateData.isFeatured = isFeatured
    if (typeof isApproved === 'boolean') updateData.isApproved = isApproved
    if (typeof isBanned === 'boolean') updateData.isBanned = isBanned

    const seed = await prisma.seed.update({
      where: { id: params.id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(seed)

  } catch (error) {
    console.error('Failed to update seed:', error)
    return NextResponse.json(
      { error: 'Failed to update seed' },
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
    await prisma.seed.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete seed:', error)
    return NextResponse.json(
      { error: 'Failed to delete seed' },
      { status: 500 }
    )
  }
}
