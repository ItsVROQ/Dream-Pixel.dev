import { NextRequest } from 'next/server';

// This is a placeholder for authentication utilities
// In a real implementation, you would use NextAuth.js or similar

export interface AuthenticatedUser {
  id: string;
  email: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  creditsRemaining: number;
}

/**
 * Get user from request (placeholder implementation)
 * In production, this would extract JWT tokens, session cookies, or API keys
 */
export async function getUserFromRequest(): Promise<AuthenticatedUser | null> {
  try {
    // TODO: Implement proper authentication
    // This could be:
    // 1. JWT token from Authorization header
    // 2. Session cookie from NextAuth
    // 3. API key from headers
    // 4. User ID from database lookup

    // For demo purposes, we'll return a demo user
    // In production, throw an error if no valid auth found
    const demoUser: AuthenticatedUser = {
      id: 'demo-user',
      email: 'demo@example.com',
      tier: 'FREE',
      creditsRemaining: 10,
    };

    return demoUser;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Require authenticated user (throws error if not authenticated)
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getUserFromRequest();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Check if user has permission for a specific action
 */
export function hasPermission(user: AuthenticatedUser, action: string): boolean {
  switch (action) {
    case 'upload-image':
      return true; // All authenticated users can upload
    
    case 'save-generation':
      if (user.tier === 'FREE') {
        return user.creditsRemaining > 0;
      }
      return true; // Pro and Enterprise have unlimited generations
    
    case 'admin-cleanup':
      return user.tier === 'ENTERPRISE'; // Only enterprise can run cleanup
    
    case 'view-stats':
      return user.tier === 'ENTERPRISE'; // Only enterprise can view detailed stats
    
    default:
      return false;
  }
}

/**
 * Middleware wrapper for API routes
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>,
  options: {
    required?: boolean;
    allowedTiers?: Array<'FREE' | 'PRO' | 'ENTERPRISE'>;
    requiredPermission?: string;
  } = {}
) {
  return async (request: NextRequest) => {
    try {
      const user = await getUserFromRequest(request);
      
      if (!user && (options.required !== false)) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (!user) {
        // Allow anonymous access
        return handler(request, {
          id: 'anonymous',
          email: 'anonymous@example.com',
          tier: 'FREE',
          creditsRemaining: 0,
        });
      }

      // Check tier restrictions
      if (options.allowedTiers && !options.allowedTiers.includes(user.tier)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Check specific permissions
      if (options.requiredPermission && !hasPermission(user, options.requiredPermission)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return await handler(request, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      
      return new Response(
        JSON.stringify({ error: 'Authentication error' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}