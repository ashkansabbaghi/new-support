import { describe, expect, it } from 'vitest'

import { createEnvelope } from '../src/envelope.js'
import type { HOST_INITPayload, HostCommandType, PayloadByType } from '../src/generated/types.js'
import { HandshakeMachine } from '../src/handshake.js'
import { createId } from '../src/ids.js'

const instanceId = '01JINSTANCE0000000000001'

function command<T extends HostCommandType>(
  type: T,
  payload: PayloadByType[T],
  requestId = createId(),
) {
  return createEnvelope({
    instanceId,
    type,
    payload,
    requestId,
  })
}

function hostInitPayload(nonce: string): HOST_INITPayload {
  return {
    nonce,
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
  }
}

function readyMachine(): HandshakeMachine {
  const machine = new HandshakeMachine({ instanceId, moduleVersion: '0.0.0' })
  machine.announceReady()
  return machine
}

function initializedMachine(): HandshakeMachine {
  const machine = readyMachine()
  const init = machine.handleHostCommand(command('HOST_INIT', hostInitPayload(machine.nonce)))
  expect(init.results[0]?.type).toBe('COMMAND_SUCCEEDED')
  const session = machine.handleHostCommand(
    command('SESSION_SET', {
      generation: 1,
      credential: { scheme: 'bearer', value: 'test-credential' },
    }),
  )
  expect(session.results[0]?.type).toBe('COMMAND_SUCCEEDED')
  expect(session.events.some((event) => event.type === 'MODULE_INITIALIZED')).toBe(true)
  expect(machine.getState()).toBe('initialized')
  return machine
}

describe('handshake lifecycle machine', () => {
  it('starts created and becomes ready after MODULE_READY', () => {
    const machine = new HandshakeMachine({ instanceId, moduleVersion: '0.0.0' })
    expect(machine.getState()).toBe('created')

    const ready = machine.announceReady()
    expect(machine.getState()).toBe('ready')
    expect(ready.type).toBe('MODULE_READY')
    expect(ready.payload.nonce).toBe(machine.nonce)
    expect(ready.payload.protocol.version).toBe('1.0')
    expect(ready.payload.capabilities).toContain('lifecycle')
  })

  it('rejects host commands before MODULE_READY', () => {
    const machine = new HandshakeMachine({ instanceId, moduleVersion: '0.0.0' })
    const output = machine.handleHostCommand(command('HOST_INIT', hostInitPayload('01JNONCE000000000000001')))
    expect(output.results[0]?.type).toBe('COMMAND_FAILED')
    if (output.results[0]?.type === 'COMMAND_FAILED') {
      expect(output.results[0].payload.code).toBe('LIFECYCLE_VIOLATION')
    }
    expect(machine.getState()).toBe('created')
  })

  it('requires a matching nonce on HOST_INIT', () => {
    const machine = readyMachine()
    const output = machine.handleHostCommand(command('HOST_INIT', hostInitPayload('01JWRONGNONCE00000001')))
    expect(output.results[0]?.type).toBe('COMMAND_FAILED')
    if (output.results[0]?.type === 'COMMAND_FAILED') {
      expect(output.results[0].payload.code).toBe('INVALID_NONCE')
    }
    expect(machine.getState()).toBe('ready')
  })

  it('rejects SESSION_SET before HOST_INIT', () => {
    const machine = readyMachine()
    const output = machine.handleHostCommand(
      command('SESSION_SET', {
        generation: 1,
        credential: { scheme: 'bearer', value: 'test-credential' },
      }),
    )
    expect(output.results[0]?.type).toBe('COMMAND_FAILED')
    if (output.results[0]?.type === 'COMMAND_FAILED') {
      expect(output.results[0].payload.code).toBe('LIFECYCLE_VIOLATION')
    }
  })

  it('walks created → ready → initialized → foreground → background → recovering → disposed', () => {
    const machine = initializedMachine()

    const opened = machine.handleHostCommand(command('MODULE_OPEN', { surface: 'chat' }))
    expect(machine.getState()).toBe('foreground')
    expect(opened.events.map((event) => event.type)).toContain('MODULE_OPENED')

    machine.handleHostCommand(command('HOST_BACKGROUND', {}))
    expect(machine.getState()).toBe('background')

    machine.handleHostCommand(command('HOST_FOREGROUND', {}))
    expect(machine.getState()).toBe('foreground')

    machine.handleHostCommand(command('NETWORK_STATUS_CHANGED', { online: false }))
    expect(machine.getState()).toBe('recovering')

    machine.handleHostCommand(command('NETWORK_STATUS_CHANGED', { online: true }))
    expect(machine.getState()).toBe('foreground')

    const closed = machine.handleHostCommand(command('MODULE_CLOSE', { reason: 'host-requested' }))
    expect(machine.getState()).toBe('initialized')
    expect(closed.events.map((event) => event.type)).toContain('MODULE_CLOSED')

    const disposed = machine.handleHostCommand(command('DISPOSE', { reason: 'host-requested' }))
    expect(machine.getState()).toBe('disposed')
    expect(disposed.events.map((event) => event.type)).toContain('MODULE_DISPOSED')
  })

  it('returns to ready on SESSION_CLEAR and ignores stale generations', () => {
    const machine = initializedMachine()
    machine.handleHostCommand(command('MODULE_OPEN', {}))
    expect(machine.getState()).toBe('foreground')

    const stale = machine.handleHostCommand(command('SESSION_CLEAR', { generation: 1, reason: 'logout' }))
    expect(stale.results[0]?.type).toBe('COMMAND_FAILED')
    if (stale.results[0]?.type === 'COMMAND_FAILED') {
      expect(stale.results[0].payload.code).toBe('STALE_GENERATION')
    }
    expect(machine.getState()).toBe('foreground')

    const cleared = machine.handleHostCommand(command('SESSION_CLEAR', { generation: 2, reason: 'logout' }))
    expect(cleared.results[0]?.type).toBe('COMMAND_SUCCEEDED')
    expect(cleared.events.some((event) => event.type === 'MODULE_CLOSED')).toBe(true)
    expect(machine.getState()).toBe('ready')
    expect(machine.hasSession()).toBe(false)
  })

  it('rejects NAVIGATE and BACK_REQUESTED outside an active session', () => {
    const machine = readyMachine()
    machine.handleHostCommand(command('HOST_INIT', hostInitPayload(machine.nonce)))

    const navigate = machine.handleHostCommand(command('NAVIGATE', { name: 'conversation.home' }))
    expect(navigate.results[0]?.type).toBe('COMMAND_FAILED')
    if (navigate.results[0]?.type === 'COMMAND_FAILED') {
      expect(navigate.results[0].payload.code).toBe('LIFECYCLE_VIOLATION')
    }
  })

  it('emits ROUTE_CHANGED on NAVIGATE and marks BACK_REQUESTED unhandled', () => {
    const machine = initializedMachine()
    machine.handleHostCommand(command('MODULE_OPEN', {}))

    const navigated = machine.handleHostCommand(
      command('NAVIGATE', {
        name: 'conversation.view',
        params: { conversationId: 'chat_123456' },
      }),
    )
    const route = navigated.events.find((event) => event.type === 'ROUTE_CHANGED')
    expect(route?.type).toBe('ROUTE_CHANGED')
    if (route?.type === 'ROUTE_CHANGED') {
      expect(route.payload.name).toBe('conversation.view')
    }

    const back = machine.handleHostCommand(command('BACK_REQUESTED', {}))
    expect(back.results[0]?.type).toBe('COMMAND_SUCCEEDED')
    if (back.results[0]?.type === 'COMMAND_SUCCEEDED') {
      expect(back.results[0].payload.handled).toBe(false)
    }
  })

  it('rejects commands after DISPOSE', () => {
    const machine = initializedMachine()
    machine.handleHostCommand(command('DISPOSE', {}))
    const again = machine.handleHostCommand(command('THEME_SET', { theme: 'dark' }))
    expect(again.results[0]?.type).toBe('COMMAND_FAILED')
    if (again.results[0]?.type === 'COMMAND_FAILED') {
      expect(again.results[0].payload.code).toBe('ALREADY_DISPOSED')
    }
    expect(machine.getState()).toBe('disposed')
  })

  it('keeps HOST_FOREGROUND in initialized when the widget is closed', () => {
    const machine = initializedMachine()
    machine.handleHostCommand(command('HOST_BACKGROUND', {}))
    expect(machine.getState()).toBe('initialized')
    machine.handleHostCommand(command('HOST_FOREGROUND', {}))
    expect(machine.getState()).toBe('initialized')
  })
})
