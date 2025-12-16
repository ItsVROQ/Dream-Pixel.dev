import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateWelcomeEmailHtml } from '@/lib/auth/email'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find user with verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email already verified' },
        { status: 200 }
      )
    }

    // Verify email and clear verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null
      }
    })

    // Send welcome email
    const welcomeEmailHtml = generateWelcomeEmailHtml(user.name || 'User')
    await sendEmail({
      to: user.email,
      subject: 'Welcome to Dream Pixel!',
      html: welcomeEmailHtml,
    })

    // Redirect to success page or return JSON
    return NextResponse.json({
      message: 'Email verified successfully. Welcome to Dream Pixel!'
    })

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}