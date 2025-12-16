import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/adminMiddleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await withAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    // Get cohort analysis - retention by signup month
    const cohortData = await prisma.$queryRaw<Array<{
      cohort_month: string
      total_users: bigint
      active_month_1: bigint
      active_month_2: bigint
      active_month_3: bigint
    }>>`
      WITH cohorts AS (
        SELECT 
          id,
          DATE_TRUNC('month', created_at) as cohort_month,
          created_at
        FROM users
      ),
      activity AS (
        SELECT 
          user_id,
          DATE_TRUNC('month', created_at) as activity_month
        FROM generations
        GROUP BY user_id, DATE_TRUNC('month', created_at)
      )
      SELECT 
        TO_CHAR(c.cohort_month, 'YYYY-MM') as cohort_month,
        COUNT(DISTINCT c.id)::int as total_users,
        COUNT(DISTINCT CASE 
          WHEN a.activity_month = c.cohort_month + INTERVAL '1 month' 
          THEN c.id 
        END)::int as active_month_1,
        COUNT(DISTINCT CASE 
          WHEN a.activity_month = c.cohort_month + INTERVAL '2 months' 
          THEN c.id 
        END)::int as active_month_2,
        COUNT(DISTINCT CASE 
          WHEN a.activity_month = c.cohort_month + INTERVAL '3 months' 
          THEN c.id 
        END)::int as active_month_3
      FROM cohorts c
      LEFT JOIN activity a ON c.id = a.user_id
      GROUP BY c.cohort_month
      ORDER BY c.cohort_month DESC
      LIMIT 12
    `

    const cohorts = cohortData.map(item => ({
      cohort_month: item.cohort_month,
      total_users: Number(item.total_users),
      retention: {
        month_1: Number(item.total_users) > 0 
          ? (Number(item.active_month_1) / Number(item.total_users) * 100).toFixed(2)
          : '0',
        month_2: Number(item.total_users) > 0
          ? (Number(item.active_month_2) / Number(item.total_users) * 100).toFixed(2)
          : '0',
        month_3: Number(item.total_users) > 0
          ? (Number(item.active_month_3) / Number(item.total_users) * 100).toFixed(2)
          : '0'
      }
    }))

    return NextResponse.json({ cohorts })

  } catch (error) {
    console.error('Failed to fetch cohort data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cohort data' },
      { status: 500 }
    )
  }
}
