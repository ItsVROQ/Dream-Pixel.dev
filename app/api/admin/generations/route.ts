import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/adminMiddleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const userId = searchParams.get('userId') || ''
    const status = searchParams.get('status') || ''
    const seed = searchParams.get('seed')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    // Build filter
    const where: Record<string, unknown> = {}

    if (userId) {
      where.userId = userId
    }

    if (status) {
      where.status = status
    }

    if (seed) {
      where.seed = parseInt(seed)
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // Fetch generations with pagination
    const [generations, total] = await Promise.all([
      prisma.generation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              tier: true
            }
          }
        }
      }),
      prisma.generation.count({ where })
    ])

    return NextResponse.json({
      generations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Failed to fetch generations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generations' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const { ids, status } = body

    if (ids && Array.isArray(ids)) {
      // Delete specific generations
      await prisma.generation.deleteMany({
        where: {
          id: { in: ids }
        }
      })
      return NextResponse.json({ deleted: ids.length })
    }

    if (status) {
      // Delete all generations with a specific status
      const result = await prisma.generation.deleteMany({
        where: { status }
      })
      return NextResponse.json({ deleted: result.count })
    }

    return NextResponse.json(
      { error: 'No valid delete criteria provided' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Failed to delete generations:', error)
    return NextResponse.json(
      { error: 'Failed to delete generations' },
      { status: 500 }
    )
  }
}
