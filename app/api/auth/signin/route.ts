import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { checkRateLimit, isAccountLocked, incrementFailedLogin, resetFailedLogin, lockAccount } from '@/lib/auth/rateLimit'
import { signJWT } from '@/lib/auth/jwt'

const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = signinSchema.parse(body)

    // Check rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = await checkRateLimit(clientIP, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 20 // 20 login attempts per 15 minutes
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if account is locked
    const lockStatus = await isAccountLocked(user.id)
    if (lockStatus.locked) {
      return NextResponse.json(
        { error: `Account locked until ${new Date(lockStatus.until!).toLocaleString()}` },
        { status: 423 }
      )
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      const attempts = await incrementFailedLogin(user.id)
      
      if (attempts >= 5) {
        await lockAccount(user.id)
        return NextResponse.json(
          { error: 'Account locked due to too many failed attempts. Please try again in 15 minutes.' },
          { status: 423 }
        )
      }
      
      return NextResponse.json(
        { error: `Invalid credentials. ${5 - attempts} attempts remaining.` },
        { status: 401 }
      )
    }

    // Reset failed attempts on successful login
    await resetFailedLogin(user.id)

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email address before signing in' },
        { status: 403 }
      )
    }

    // Generate JWT token
    const token = signJWT({
      userId: user.id,
      email: user.email,
      tier: user.tier,
    })

    // Set HTTP-only cookie
    const response = NextResponse.json({
      message: 'Signed in successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        emailVerified: user.emailVerified,
        creditsRemaining: user.creditsRemaining,
      }
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Signin error:', error)
    
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