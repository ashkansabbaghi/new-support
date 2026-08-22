import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { HOST_COMMAND_TYPES, MODULE_EVENT_TYPES, RESULT_TYPES } from '@nipoto/support-protocol'
import { describe, expect, it } from 'vitest'

import { inspectIncoming } from '../src/inspect.js'

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../protocol/fixtures')
const moduleOrigin = 'https://support.example.test'
const iframeWindow = { id: 'iframe-window' }

const hostCommandSet = new Set<string>(HOST_COMMAND_TYPES)
const incomingTypes = new Set<string>([...MODULE_EVENT_TYPES, ...RESULT_TYPES])

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

function inspect(value: unknown, overrides?: { origin?: string; source?: unknown }) {
  return inspectIncoming({
    data: value,
    origin: overrides?.origin ?? moduleOrigin,
    source: overrides?.source ?? iframeWindow,
    expectedOrigin: moduleOrigin,
    expectedSource: iframeWindow,
  })
}

describe('web-sdk handshake fixtures', () => {
  it('accepts valid module→host fixtures from the matching origin and source', async () => {
    const fixtures = await loadFixtures('valid')
    const incoming = fixtures.filter((fixture) => {
      const type = (fixture.value as { type?: string }).type
      return type !== undefined && incomingTypes.has(type)
    })
    expect(incoming.length).toBeGreaterThan(0)

    for (const fixture of incoming) {
      const result = inspect(fixture.value)
      expect(result.ok, fixture.name).toBe(true)
    }
  })

  it('rejects valid host-command fixtures as the wrong direction', async () => {
    const fixtures = await loadFixtures('valid')
    const outgoing = fixtures.filter((fixture) => {
      const type = (fixture.value as { type?: string }).type
      return type !== undefined && hostCommandSet.has(type)
    })
    expect(outgoing.length).toBeGreaterThan(0)

    for (const fixture of outgoing) {
      const result = inspect(fixture.value)
      expect(result.ok, fixture.name).toBe(false)
      if (!result.ok) {
        expect(result.code, fixture.name).toBe('UNEXPECTED_TYPE')
      }
    }
  })

  it('rejects every invalid protocol fixture even from the matching origin', async () => {
    const fixtures = await loadFixtures('invalid')
    expect(fixtures.length).toBeGreaterThan(0)

    for (const fixture of fixtures) {
      const result = inspect(fixture.value)
      expect(result.ok, fixture.name).toBe(false)
    }
  })

  it('rejects unknown events, domain commands, attachments, and oversized envelopes', async () => {
    const fixtures = await loadFixtures('invalid')
    const byName = Object.fromEntries(fixtures.map((fixture) => [fixture.name, fixture.value]))

    for (const name of ['unknown-type.json', 'send-message.json', 'convey-chat.json'] as const) {
      const result = inspect(byName[name])
      expect(result.ok, name).toBe(false)
      if (!result.ok) {
        expect(result.code, name).toBe('UNKNOWN_TYPE')
      }
    }

    const attachment = inspect(byName['attachment-on-bridge.json'])
    expect(attachment.ok).toBe(false)
    if (!attachment.ok) {
      expect(attachment.code).toBe('INVALID_ENVELOPE')
    }
  })

  it('rejects MODULE_READY when origin or source does not match', async () => {
    const fixtures = await loadFixtures('valid')
    const ready = fixtures.find((fixture) => (fixture.value as { type?: string }).type === 'MODULE_READY')
    expect(ready).toBeTruthy()

    const wrongOrigin = inspect(ready?.value, { origin: 'https://evil.example' })
    expect(wrongOrigin.ok).toBe(false)
    if (!wrongOrigin.ok) {
      expect(wrongOrigin.code).toBe('ORIGIN_MISMATCH')
    }

    const wrongSource = inspect(ready?.value, { source: { id: 'other-window' } })
    expect(wrongSource.ok).toBe(false)
    if (!wrongSource.ok) {
      expect(wrongSource.code).toBe('SOURCE_MISMATCH')
    }
  })
})
