import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { MAX_ENVELOPE_BYTES } from '../src/constants.js'
import { validateHostCommand, validateMessage } from '../src/validate.js'

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

async function loadFixtures(kind: 'valid' | 'invalid'): Promise<Array<{ name: string; value: unknown }>> {
  const dir = join(fixturesRoot, kind)
  const files = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort()
  return Promise.all(
    files.map(async (name) => ({
      name,
      value: JSON.parse(await readFile(join(dir, name), 'utf8')) as unknown,
    })),
  )
}

describe('protocol contract fixtures', () => {
  it('accepts every valid fixture', async () => {
    const fixtures = await loadFixtures('valid')
    expect(fixtures.length).toBeGreaterThan(0)

    for (const fixture of fixtures) {
      const result = validateMessage(fixture.value)
      expect(result.ok, fixture.name).toBe(true)
    }
  })

  it('rejects every invalid fixture', async () => {
    const fixtures = await loadFixtures('invalid')
    expect(fixtures.length).toBeGreaterThan(0)

    for (const fixture of fixtures) {
      const result = validateMessage(fixture.value)
      expect(result.ok, fixture.name).toBe(false)
    }
  })

  it('maps expected failure codes for representative invalid fixtures', async () => {
    const fixtures = await loadFixtures('invalid')
    const byName = Object.fromEntries(fixtures.map((fixture) => [fixture.name, fixture.value]))

    const expectCode = (name: string, code: string) => {
      const result = validateMessage(byName[name])
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code, name).toBe(code)
      }
    }

    expectCode('wrong-channel.json', 'INVALID_ENVELOPE')
    expectCode('missing-type.json', 'INVALID_ENVELOPE')
    expectCode('unknown-type.json', 'UNKNOWN_TYPE')
    expectCode('send-message.json', 'UNKNOWN_TYPE')
    expectCode('convey-chat.json', 'UNKNOWN_TYPE')
    expectCode('protocol-v2.json', 'UNSUPPORTED_PROTOCOL')
    expectCode('unknown-required-capability.json', 'UNSUPPORTED_CAPABILITY')
    expectCode('command-null-request-id.json', 'INVALID_ENVELOPE')
    expectCode('missing-host-init-fields.json', 'INVALID_ENVELOPE')
    expectCode('message-text-on-unread.json', 'INVALID_ENVELOPE')
    expectCode('url-in-payload.json', 'INVALID_ENVELOPE')
    expectCode('html-in-branding.json', 'INVALID_ENVELOPE')
    expectCode('attachment-on-bridge.json', 'INVALID_ENVELOPE')
    expectCode('token-in-params.json', 'INVALID_ENVELOPE')
  })

  it('rejects envelopes over MAX_ENVELOPE_BYTES', () => {
    const oversized = {
      channel: 'nipoto.support',
      protocolVersion: '1.0',
      instanceId: '01JINSTANCE0000000000001',
      messageId: '01JMESSAGE00000000000001',
      requestId: '01JREQUEST0000000000001',
      type: 'THEME_SET',
      sentAt: '2026-08-19T05:30:00.000Z',
      payload: { theme: 'light', pad: 'x'.repeat(MAX_ENVELOPE_BYTES) },
    }

    const result = validateMessage(oversized)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('ENVELOPE_TOO_LARGE')
    }
  })

  it('rejects unknown host commands and module events at the command boundary', async () => {
    const fixtures = await loadFixtures('invalid')
    const byName = Object.fromEntries(fixtures.map((fixture) => [fixture.name, fixture.value]))

    for (const name of ['unknown-type.json', 'send-message.json', 'convey-chat.json'] as const) {
      const result = validateHostCommand(byName[name])
      expect(result.ok, name).toBe(false)
      if (!result.ok) {
        expect(result.code, name).toBe('UNKNOWN_TYPE')
      }
    }

    const attachment = validateHostCommand(byName['attachment-on-bridge.json'])
    expect(attachment.ok).toBe(false)
    if (!attachment.ok) {
      expect(attachment.code).toBe('INVALID_ENVELOPE')
    }
  })
})
