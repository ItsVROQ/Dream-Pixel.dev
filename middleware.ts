import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'

// Simple in-memory rate limiting store (for development)
// In production, use Upstash Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
  return ip.trim()
}

function checkRateLimit(ip: string, windowMs: number = 900000, maxRequests: number = 100): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url)

  // Add security headers to all responses
  const response = NextResponse.next()
  
  // Strict-Transport-Security (HSTS)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel.com *.sentry.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' *.sentry.io *.vercel.com https:; frame-ancestors 'none';"
  )

  // Rate limiting for public API endpoints
  const publicApiRoutes = [
    '/api/health',
    '/api/auth/signup',
    '/api/auth/signin',
    '/api/auth/forgot-password',
  ]

  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route))
  
  if (isPublicApiRoute) {
    const clientIP = getClientIP(request)
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10)
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)

    if (!checkRateLimit(clientIP, windowMs, maxRequests)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  // Define protected routes
  const protectedRoutes = [
    '/api/generations',
    '/api/seeds',
    '/api/subscription',
    '/api/profile',
    '/api/user',
    '/api/images',
    '/api/jobs',
  ]

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    return withAuth(request, undefined, {
      requireEmailVerification: true
    })
  }

  // Allow the request to continue with security headers
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
}