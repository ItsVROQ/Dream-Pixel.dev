import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, validatePassword } from '@/lib/auth/password'
import { checkRateLimit } from '@/lib/auth/rateLimit'
import { sendEmail, generateVerificationEmailHtml, generateWelcomeEmailHtml } from '@/lib/auth/email'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
  name: z.string().min(1, 'Name is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = signupSchema.parse(body)

    // Check rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = await checkRateLimit(clientIP, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5 // 5 signups per 15 minutes
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordValidation.errors },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Generate verification token
    const verificationToken = crypto.randomUUID()

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        verificationToken,
        tier: 'FREE',
        creditsRemaining: 10, // Give 10 free credits on signup
      }
    })

    // Send verification email
    const verificationEmailHtml = generateVerificationEmailHtml(verificationToken)
    await sendEmail({
      to: email,
      subject: 'Verify Your Dream Pixel Account',
      html: verificationEmailHtml,
    })

    const response = NextResponse.json(
      {
        message: 'Account created successfully. Please verify your email address.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          emailVerified: user.emailVerified,
        }
      },
      { status: 201 }
    )

    // Set CSRF token for future requests
    const csrfToken = crypto.randomBytes(32).toString('hex')
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Signup error:', error)
    
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