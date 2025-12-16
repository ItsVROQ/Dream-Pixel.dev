import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function setCSRFTokenCookie(response: NextResponse): void {
  const csrfToken = generateCSRFToken()
  
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Needs to be accessible to JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
}

export function validateCSRFToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  
  if (!cookieToken || !headerToken) {
    return false
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  )
}

export function withCSRFProtection(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    // Only apply CSRF protection to state-changing operations
    const method = request.method.toUpperCase()
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    
    if (stateChangingMethods.includes(method)) {
      // Skip CSRF check for API endpoints that handle authentication
      const pathname = new URL(request.url).pathname
      const authPaths = [
        '/api/auth/signin',
        '/api/auth/signup',
        '/api/auth/forgot-password',
        '/api/auth/reset-password'
      ]
      
      if (!authPaths.some(path => pathname.startsWith(path))) {
        if (!validateCSRFToken(request)) {
          return NextResponse.json(
            { error: 'CSRF token validation failed' },
            { status: 403 }
          )
        }
      }
    }
    
    return handler(request)
  }
}