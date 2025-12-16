import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url)

  const protectedRoutes = ['/api/generations', '/api/seeds', '/api/subscription', '/api/profile', '/api/user']

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  const authResult = await withAuth(request, undefined, {
    requireEmailVerification: true,
  })

  if (authResult instanceof NextResponse) {
    return authResult
  }

  return NextResponse.next()
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