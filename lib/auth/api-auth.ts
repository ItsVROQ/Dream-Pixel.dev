import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashApiKey } from '@/lib/auth/encryption'

export async function authenticateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  
  // Hash the token to look it up
  const hashed = hashApiKey(token)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hashed },
    include: { user: true }
  })

  if (!apiKey || apiKey.revokedAt) {
    return null
  }
  
  // Update last used (fire and forget usually, but await here is fine)
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  })

  return {
    user: apiKey.user,
    apiKey
  }
}
