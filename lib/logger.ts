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
