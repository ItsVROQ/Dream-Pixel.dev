import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/adminMiddleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    // Churn analysis for subscriptions
    const [
      activeSubscriptions,
      canceledSubscriptions,
      churnedThisMonth
    ] = await Promise.all([
      prisma.subscription.count({
        where: {
          status: {
            in: ['ACTIVE', 'TRIALING']
          }
        }
      }),
      prisma.subscription.count({
        where: {
          status: 'CANCELED'
        }
      }),
      prisma.subscription.count({
        where: {
          status: 'CANCELED',
          currentPeriodEnd: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ])

    // Average processing time per generation
    const avgProcessingTime = await prisma.generation.aggregate({
      where: {
        status: 'SUCCEEDED',
        processingTimeMs: { not: null }
      },
      _avg: {
        processingTimeMs: true
      }
    })

    // Popular prompts (top 10 words)
    const generations = await prisma.generation.findMany({
      where: { status: 'SUCCEEDED' },
      select: { prompt: true },
      take: 1000,
      orderBy: { createdAt: 'desc' }
    })

    // Simple word frequency analysis
    const wordFrequency: Record<string, number> = {}
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being'])
    
    generations.forEach(gen => {
      const words = gen.prompt.toLowerCase().match(/\b\w+\b/g) || []
      words.forEach(word => {
        if (word.length > 3 && !stopWords.has(word)) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1
        }
      })
    })

    const popularWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }))

    const totalSubscriptions = activeSubscriptions + canceledSubscriptions
    const churnRate = totalSubscriptions > 0 
      ? ((canceledSubscriptions / totalSubscriptions) * 100).toFixed(2)
      : 0

    return NextResponse.json({
      subscriptions: {
        active: activeSubscriptions,
        canceled: canceledSubscriptions,
        churnRate,
        churnedThisMonth
      },
      performance: {
        avgProcessingTimeMs: avgProcessingTime._avg.processingTimeMs || 0
      },
      popularWords
    })

  } catch (error) {
    console.error('Failed to fetch churn data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch churn data' },
      { status: 500 }
    )
  }
}
