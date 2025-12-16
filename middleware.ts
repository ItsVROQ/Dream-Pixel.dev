import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { withAdmin } from '@/lib/auth/adminMiddleware'

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url)

  // Define admin routes (both UI and API)
  const adminRoutes = [
    '/admin',
    '/api/admin'
  ]

  // Define protected routes
  const protectedRoutes = [
    '/api/generations',
    '/api/seeds',
    '/api/subscription',
    '/api/profile',
    '/api/user',
  ]

  // Check if the current path is an admin route
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

  if (isAdminRoute) {
    const result = await withAdmin(request)
    if (result instanceof NextResponse) {
      return result
    }
    // Admin is authenticated, continue
    return
  }

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    return withAuth(request, undefined, {
      requireEmailVerification: true
    })
  }

  // Allow the request to continue
  return
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