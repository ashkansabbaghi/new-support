import { describe, expect, it } from 'vitest'

import { createSafeLogger, redact } from '../src/safe-log.js'
import { entryUrlContainsToken } from '../src/url-guard.js'

describe('safe logging', () => {
  it('redacts credentials and message text', () => {
    const redacted = redact({
      type: 'SESSION_SET',
      payload: {
        generation: 1,
        credential: { scheme: 'bearer', value: 'super-secret' },
        text: 'hello user',
      },
    })

    expect(redacted).toEqual({
      type: 'SESSION_SET',
      payload: {
        generation: 1,
        credential: '[redacted]',
        text: '[redacted]',
      },
    })
  })

  it('never writes raw credential values to the sink', () => {
    const lines: unknown[] = []
    const logger = createSafeLogger({
      info: (_message, meta) => {
        lines.push(meta)
      },
    })

    logger.info('session-set', {
      credential: { value: 'super-secret' },
      requestId: '01JREQUEST0000000000001',
    })

    expect(JSON.stringify(lines)).not.toContain('super-secret')
    expect(JSON.stringify(lines)).toContain('[redacted]')
  })
})

describe('entry URL token guard', () => {
  it('detects token-like query keys without reading values', () => {
    expect(entryUrlContainsToken({ search: '?locale=fa-IR', hash: '' })).toBe(false)
    expect(entryUrlContainsToken({ search: '?token=abc', hash: '' })).toBe(true)
    expect(entryUrlContainsToken({ search: '', hash: '#/chat?access_token=abc' })).toBe(true)
  })
})
