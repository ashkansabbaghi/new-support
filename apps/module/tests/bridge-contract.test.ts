import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  HOST_COMMAND_TYPES,
  HandshakeMachine,
  MAX_ENVELOPE_BYTES,
  createEnvelope,
  processHostMessage,
  validateHostCommand,
} from '@nipoto/support-protocol'
import { describe, expect, it } from 'vitest'

const fixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/protocol/fixtures',
)

const hostCommandSet = new Set<string>(HOST_COMMAND_TYPES)

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

describe('module bridge contract', () => {
  it('accepts every valid host-command fixture at the schema boundary', async () => {
    const fixtures = await loadFixtures('valid')
    const commands = fixtures.filter((fixture) => {
      const type = (fixture.value as { type?: string }).type
      return type !== undefined && hostCommandSet.has(type)
    })
    expect(commands.length).toBeGreaterThan(0)

    for (const fixture of commands) {
      const result = validateHostCommand(fixture.value)
      expect(result.ok, fixture.name).toBe(true)
    }
  })

  it('walks a valid HOST_INIT through processHostMessage', async () => {
    const machine = new HandshakeMachine({
      instanceId: '01JINSTANCE0000000000001',
      moduleVersion: '0.0.0',
    })
    const ready = machine.announceReady()
    const { validation, output } = processHostMessage(
      machine,
      createEnvelope({
        instanceId: machine.instanceId,
        type: 'HOST_INIT',
        requestId: '01JREQUEST0000000000001',
        payload: {
          nonce: ready.payload.nonce,
          side: 'user',
          locale: 'fa-IR',
          direction: 'rtl',
          theme: 'light',
          initialRoute: { name: 'conversation.home' },
          host: {
            appId: 'nipoto-web',
            appVersion: '1.4.2',
            branding: { brandId: 'nipoto' },
            platform: 'web',
          },
        },
      }),
    )
    expect(validation.ok).toBe(true)
    expect(output?.results[0]?.type).toBe('COMMAND_SUCCEEDED')
  })

  it('rejects unknown commands, domain commands, attachments, and oversized envelopes', async () => {
    const machine = new HandshakeMachine({ instanceId: '01JINSTANCE0000000000001', moduleVersion: '0.0.0' })
    machine.announceReady()
    const fixtures = await loadFixtures('invalid')
    const byName = Object.fromEntries(fixtures.map((fixture) => [fixture.name, fixture.value]))

    for (const name of ['unknown-type.json', 'send-message.json', 'convey-chat.json'] as const) {
      const { validation } = processHostMessage(machine, byName[name])
      expect(validation.ok, name).toBe(false)
      if (!validation.ok) {
        expect(validation.code, name).toBe('UNKNOWN_TYPE')
      }
    }

    const attachment = processHostMessage(machine, byName['attachment-on-bridge.json'])
    expect(attachment.validation.ok).toBe(false)
    if (!attachment.validation.ok) {
      expect(attachment.validation.code).toBe('INVALID_ENVELOPE')
    }

    const oversized = {
      channel: 'nipoto.support',
      protocolVersion: '1.0',
      instanceId: machine.instanceId,
      messageId: '01JMESSAGE00000000000001',
      requestId: '01JREQUEST0000000000001',
      type: 'THEME_SET',
      sentAt: '2026-08-19T05:30:00.000Z',
      payload: { theme: 'light', pad: 'x'.repeat(MAX_ENVELOPE_BYTES) },
    }
    const tooLarge = processHostMessage(machine, oversized)
    expect(tooLarge.validation.ok).toBe(false)
    if (!tooLarge.validation.ok) {
      expect(tooLarge.validation.code).toBe('ENVELOPE_TOO_LARGE')
    }
    expect(tooLarge.output).toBeNull()
  })

  it('rejects module events when they arrive as host commands', async () => {
    const ready = JSON.parse(
      await readFile(join(fixturesRoot, 'valid/module-ready.json'), 'utf8'),
    ) as unknown
    const result = validateHostCommand(ready)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNKNOWN_TYPE')
    }
  })
})
