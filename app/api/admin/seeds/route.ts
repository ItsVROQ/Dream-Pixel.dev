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
    const category = searchParams.get('category') || ''
    const featured = searchParams.get('featured')
    const approved = searchParams.get('approved')
    const banned = searchParams.get('banned')

    const skip = (page - 1) * limit

    // Build filter
    const where: Record<string, unknown> = {}

    if (category) {
      where.category = category
    }

    if (featured !== null && featured !== '') {
      where.isFeatured = featured === 'true'
    }

    if (approved !== null && approved !== '') {
      where.isApproved = approved === 'true'
    }

    if (banned !== null && banned !== '') {
      where.isBanned = banned === 'true'
    }

    // Fetch seeds with pagination
    const [seeds, total] = await Promise.all([
      prisma.seed.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
              tier: true
            }
          }
        }
      }),
      prisma.seed.count({ where })
    ])

    return NextResponse.json({
      seeds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Failed to fetch seeds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seeds' },
      { status: 500 }
    )
  }
}
