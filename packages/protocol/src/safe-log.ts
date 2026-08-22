import { SENSITIVE_LOG_KEYS } from './constants.js'

const sensitive = new Set<string>(SENSITIVE_LOG_KEYS)

function isSensitiveKey(key: string): boolean {
  return sensitive.has(key.toLowerCase())
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item))
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      out[key] = isSensitiveKey(key) ? '[redacted]' : redact(nested)
    }
    return out
  }
  return value
}

export type SafeLogSink = {
  debug?: (message: string, meta?: unknown) => void
  info?: (message: string, meta?: unknown) => void
  warn?: (message: string, meta?: unknown) => void
  error?: (message: string, meta?: unknown) => void
}

export function createSafeLogger(sink: SafeLogSink = console) {
  const write = (level: keyof SafeLogSink, event: string, meta?: Record<string, unknown>) => {
    const fn = sink[level]
    if (!fn) {
      return
    }
    if (meta) {
      fn(`[support-protocol] ${event}`, redact(meta))
      return
    }
    fn(`[support-protocol] ${event}`)
  }

  return {
    debug(event: string, meta?: Record<string, unknown>) {
      write('debug', event, meta)
    },
    info(event: string, meta?: Record<string, unknown>) {
      write('info', event, meta)
    },
    warn(event: string, meta?: Record<string, unknown>) {
      write('warn', event, meta)
    },
    error(event: string, meta?: Record<string, unknown>) {
      write('error', event, meta)
    },
  }
}
