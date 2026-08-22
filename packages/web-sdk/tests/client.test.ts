import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createEnvelope, type ProtocolEnvelope } from '@nipoto/support-protocol'
import { describe, expect, it } from 'vitest'

import { createSupportClient } from '../src/client.js'
import { COOKIE_CREDENTIAL_PLACEHOLDER, IFRAME_SANDBOX } from '../src/constants.js'
import type { SupportIframeHandle } from '../src/types.js'

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../protocol/fixtures/valid')
const moduleOrigin = 'https://support.example.test'

type Posted = { data: unknown; origin: string; transfer?: Transferable[] }
const iframeWindow = {
  postMessage(data: unknown, origin: string, transfer?: Transferable[]) {
    void data
    void origin
    void transfer
  },
  focus() {
    return undefined
  },
}

async function loadReady(): Promise<ProtocolEnvelope<'MODULE_READY'>> {
  return JSON.parse(await readFile(join(fixturesRoot, 'module-ready.json'), 'utf8')) as ProtocolEnvelope<'MODULE_READY'>
}

function createHarness() {
  const posted: Posted[] = []
  let listener: ((event: MessageEvent) => void) | null = null
  let removed = false
  let containerDisposed = false
  let onLoad: (() => void) | null = null

  iframeWindow.postMessage = (data: unknown, origin: string, transfer?: Transferable[]) => {
    posted.push({ data, origin, transfer })
  }

  const handle: SupportIframeHandle = {
    focus() {
      return undefined
    },
    remove() {
      removed = true
    },
    contentWindow: iframeWindow,
  }

  const client = createSupportClient({
    origin: moduleOrigin,
    widgetId: 'wid_public_example',
    locale: 'fa-IR',
    handshakeTimeoutMs: 2_000,
    timeoutMs: 2_000,
    hooks: {
      createIframe(input) {
        expect(input.sandbox).toBe(IFRAME_SANDBOX)
        expect(input.src.includes('token')).toBe(false)
        onLoad = input.onLoad
        return handle
      },
      addWindowListener(next) {
        listener = next
        return () => {
          listener = null
        }
      },
      mountContainer() {
        return {
          applyOpen() {
            return undefined
          },
          applyClose() {
            return undefined
          },
          dispose() {
            containerDisposed = true
          },
        }
      },
    },
  })

  return {
    client,
    posted,
    get listener() {
      return listener
    },
    deliver(data: unknown, origin = moduleOrigin, source: unknown = iframeWindow) {
      listener?.({ data, origin, source } as MessageEvent)
    },
    load() {
      onLoad?.()
    },
    get removed() {
      return removed
    },
    get containerDisposed() {
      return containerDisposed
    },
  }
}

function succeed(command: 'HOST_INIT' | 'SESSION_SET' | 'MODULE_OPEN' | 'MODULE_CLOSE' | 'DISPOSE', requestId: string) {
  return createEnvelope({
    instanceId: '01JINSTANCE0000000000001',
    type: 'COMMAND_SUCCEEDED',
    requestId,
    payload: { command },
  })
}

function lastCommand(posted: Posted[], type: string) {
  return [...posted].reverse().find((item) => {
    return Boolean(item.data && typeof item.data === 'object' && (item.data as { type?: string }).type === type)
  })
}

async function waitForOutgoing<T extends 'SESSION_SET' | 'MODULE_OPEN' | 'MODULE_CLOSE' | 'DISPOSE'>(
  type: T,
  posted: Posted[],
  modulePort: ReturnType<typeof startModulePort>,
): Promise<ProtocolEnvelope<T>> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const envelope = (modulePort.last(type) ?? lastCommand(posted, type)?.data) as ProtocolEnvelope<T> | undefined
    if (envelope) {
      return envelope
    }
    await new Promise((resolve) => setImmediate(resolve))
  }
  throw new Error(`did not observe ${type}`)
}

function startModulePort(transfer: Transferable[] | undefined) {
  const port = transfer?.[0]
  if (!(port instanceof MessagePort)) {
    throw new Error('expected MessageChannel port')
  }
  const messages: unknown[] = []
  port.addEventListener('message', (event) => {
    messages.push(event.data)
  })
  port.start()
  return {
    port,
    messages,
    last(type: string) {
      return [...messages].reverse().find((item) => {
        return Boolean(item && typeof item === 'object' && (item as { type?: string }).type === type)
      })
    },
  }
}

describe('createSupportClient', () => {
  it('handshakes, setSession without a token, open/close, and dispose leave the host clean', async () => {
    const ready = await loadReady()
    const harness = createHarness()
    const events: string[] = []
    harness.client.on('ready', () => events.push('ready'))
    harness.client.on('opened', () => events.push('opened'))
    harness.client.on('closed', () => events.push('closed'))
    harness.client.on('disposed', () => events.push('disposed'))

    harness.load()
    const probe = lastCommand(harness.posted, 'HOST_HELLO')
    expect(probe?.origin).toBe(moduleOrigin)

    harness.deliver(ready)
    expect(events).toContain('ready')

    const hostInit = lastCommand(harness.posted, 'HOST_INIT')
    expect(hostInit).toBeTruthy()
    const initEnvelope = hostInit?.data as ProtocolEnvelope<'HOST_INIT'>
    expect(initEnvelope.payload.nonce).toBe(ready.payload.nonce)
    expect(hostInit?.transfer?.length).toBe(1)

    const modulePort = startModulePort(hostInit?.transfer)
    harness.deliver(succeed('HOST_INIT', initEnvelope.requestId as string))
    await harness.client.ready

    const sessionDone = harness.client.setSession({
      generation: 1,
      token: 'should-not-travel',
    } as { generation: number })
    const sessionEnvelope = await waitForOutgoing('SESSION_SET', harness.posted, modulePort)
    expect(sessionEnvelope.payload.credential.value).toBe(COOKIE_CREDENTIAL_PLACEHOLDER)
    expect(JSON.stringify(sessionEnvelope)).not.toContain('should-not-travel')
    harness.deliver(succeed('SESSION_SET', sessionEnvelope.requestId as string))
    await sessionDone

    const opened = harness.client.open({ surface: 'chat' })
    const openEnvelope = await waitForOutgoing('MODULE_OPEN', harness.posted, modulePort)
    harness.deliver(succeed('MODULE_OPEN', openEnvelope.requestId as string))
    harness.deliver(
      createEnvelope({
        instanceId: ready.instanceId,
        type: 'MODULE_OPENED',
        payload: { surface: 'chat' },
      }),
    )
    await opened
    expect(events).toContain('opened')

    const closed = harness.client.close()
    const closeEnvelope = await waitForOutgoing('MODULE_CLOSE', harness.posted, modulePort)
    harness.deliver(succeed('MODULE_CLOSE', closeEnvelope.requestId as string))
    harness.deliver(
      createEnvelope({
        instanceId: ready.instanceId,
        type: 'MODULE_CLOSED',
        payload: { reason: 'host-requested' },
      }),
    )
    await closed
    expect(events).toContain('closed')

    const disposed = harness.client.dispose()
    const disposeEnvelope = await waitForOutgoing('DISPOSE', harness.posted, modulePort)
    harness.deliver(succeed('DISPOSE', disposeEnvelope.requestId as string))
    harness.deliver(
      createEnvelope({
        instanceId: ready.instanceId,
        type: 'MODULE_DISPOSED',
        payload: { reason: 'host-requested' },
      }),
    )
    await disposed
    expect(harness.removed).toBe(true)
    expect(harness.containerDisposed).toBe(true)
    expect(harness.listener).toBeNull()
  })

  it('ignores MODULE_READY from the wrong origin', async () => {
    const ready = await loadReady()
    const harness = createHarness()
    harness.deliver(ready, 'https://evil.example')
    expect(lastCommand(harness.posted, 'HOST_INIT')).toBeUndefined()
  })

  it('rejects unknown events and does not emit them to the host', async () => {
    const ready = await loadReady()
    const harness = createHarness()
    const events: string[] = []
    harness.client.on('error', () => events.push('error'))
    harness.client.on('opened', () => events.push('opened'))

    harness.load()
    harness.deliver(ready)
    const hostInit = lastCommand(harness.posted, 'HOST_INIT')
    const initEnvelope = hostInit?.data as ProtocolEnvelope<'HOST_INIT'>
    startModulePort(hostInit?.transfer)
    harness.deliver(succeed('HOST_INIT', initEnvelope.requestId as string))
    await harness.client.ready

    harness.deliver({
      channel: 'nipoto.support',
      protocolVersion: '1.0',
      instanceId: ready.instanceId,
      messageId: '01JMESSAGEUNKNOWN0000001',
      requestId: null,
      type: 'SEND_MESSAGE',
      sentAt: '2026-08-19T05:30:00.000Z',
      payload: { text: 'nope' },
    })
    harness.deliver({
      channel: 'nipoto.support',
      protocolVersion: '1.0',
      instanceId: ready.instanceId,
      messageId: '01JMESSAGEUNKNOWN0000002',
      requestId: null,
      type: 'RESIZE_WIDGET',
      sentAt: '2026-08-19T05:30:00.000Z',
      payload: {},
    })
    expect(events).toEqual([])
  })
})
