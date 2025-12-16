import * as Sentry from '@sentry/nextjs'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: Record<string, unknown>
  error?: Error
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development'
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

  private getLogLevelPriority(level: LogLevel): number {
    const priorities: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    }
    return priorities[level]
  }

  private shouldLog(level: LogLevel): boolean {
    return this.getLogLevelPriority(level) <= this.getLogLevelPriority(this.logLevel)
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry)
  }

  private logToConsole(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    if (this.isDev) {
      console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](
        prefix,
        message,
        data || ''
      )
    }
  }

  error(message: string, data?: Record<string, unknown> | Error): void {
    if (!this.shouldLog('error')) return

    const isError = data instanceof Error
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      data: isError ? undefined : (data as Record<string, unknown>),
      error: isError ? data : undefined,
    }

    this.logToConsole('error', message, entry.data)
    console.error(this.formatLog(entry))

    // Send to Sentry
    if (isError) {
      Sentry.captureException(data)
    } else {
      Sentry.captureException(new Error(message), { contexts: { data: entry.data } })
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data,
    }

    this.logToConsole('warn', message, data)
    console.warn(this.formatLog(entry))

    Sentry.captureMessage(message, 'warning')
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data,
    }

    this.logToConsole('info', message, data)
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      data,
    }

    this.logToConsole('debug', message, data)
  }
}

export const logger = new Logger()
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
export interface LogContext {
  userId?: string
  generationId?: string
  provider?: string
  [key: string]: any
}

export class Logger {
  private context: LogContext = {}

  constructor(context: LogContext = {}) {
    this.context = context
  }

  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context }
  }

  private formatMessage(message: string): string {
    const parts = [new Date().toISOString()]

    if (this.context.generationId) {
      parts.push(`[Generation ${this.context.generationId}]`)
    }

    if (this.context.provider) {
      parts.push(`[Provider ${this.context.provider}]`)
    }

    if (this.context.userId) {
      parts.push(`[User ${this.context.userId}]`)
    }

    return `${parts.join(' ')} ${message}`
  }

  info(message: string, data?: any) {
    const formatted = this.formatMessage(message)
    if (data) {
      console.log(formatted, data)
    } else {
      console.log(formatted)
    }
  }

  error(message: string, error?: Error | any) {
    const formatted = this.formatMessage(`ERROR: ${message}`)
    if (error instanceof Error) {
      console.error(formatted, error.message, error.stack)
    } else {
      console.error(formatted, error)
    }
  }

  warn(message: string, data?: any) {
    const formatted = this.formatMessage(`WARN: ${message}`)
    if (data) {
      console.warn(formatted, data)
    } else {
      console.warn(formatted)
    }
  }

  debug(message: string, data?: any) {
    if (process.env.DEBUG) {
      const formatted = this.formatMessage(`DEBUG: ${message}`)
      if (data) {
        console.debug(formatted, data)
      } else {
        console.debug(formatted)
      }
    }
  }
}

export function createLogger(context?: LogContext): Logger {
  return new Logger(context)
}
