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
