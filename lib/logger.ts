import { prisma } from '@/lib/prisma'

export async function logError(
  level: 'ERROR' | 'WARN' | 'INFO',
  message: string,
  options?: {
    stack?: string
    metadata?: Record<string, any>
    userId?: string
    endpoint?: string
  }
) {
  try {
    await prisma.errorLog.create({
      data: {
        level,
        message,
        stack: options?.stack,
        metadata: options?.metadata,
        userId: options?.userId,
        endpoint: options?.endpoint
      }
    })
  } catch (error) {
    console.error('Failed to log error to database:', error)
  }
}
