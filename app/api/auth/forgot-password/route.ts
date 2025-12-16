import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/auth/rateLimit'
import { sendEmail, generatePasswordResetEmailHtml } from '@/lib/auth/email'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Check rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = await checkRateLimit(clientIP, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3 // 3 password reset requests per hour
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Always return success for security reasons (don't reveal if email exists)
    const response = NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    })

    if (user) {
      // Generate reset token
      const resetToken = crypto.randomUUID()
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Save reset token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry
        }
      })

      // Send password reset email
      const resetEmailHtml = generatePasswordResetEmailHtml(resetToken)
      await sendEmail({
        to: email,
        subject: 'Reset Your Dream Pixel Password',
        html: resetEmailHtml,
      })
    }

    return response

  } catch (error) {
    console.error('Forgot password error:', error)
    
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