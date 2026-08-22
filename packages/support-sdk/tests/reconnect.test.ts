import { describe, expect, it, vi } from 'vitest'

import { createSupportGateway } from '../src/gateway/SupportGateway.js'
import { createMutationLedger } from '../src/realtime/MutationLedger.js'
import { createSubscriptionRegistry, subscriptionKey } from '../src/realtime/SubscriptionRegistry.js'
import { createSessionManager } from '../src/session/SessionManager.js'
import type { AbrCommand, AbrList, SupportApp } from '../src/app.js'

function chain(send: ReturnType<typeof vi.fn>): AbrList & AbrCommand {
  const self = {
    where: vi.fn(() => self),
    sort: vi.fn(() => self),
    limit: vi.fn(() => self),
    skip: vi.fn(() => self),
    take: vi.fn(() => self),
    get: vi.fn(() => self),
    count: vi.fn(() => self),
    first: vi.fn(() => self),
    select: vi.fn(() => self),
    send,
    await: vi.fn(() => self),
    getOpenChats: vi.fn(() => self),
    countOpenChats: vi.fn(() => self),
    getActiveChats: vi.fn(() => self),
    getClosedChats: vi.fn(() => self),
    getQueuedChats: vi.fn(() => self),
    getChatMessages: vi.fn(() => self),
    getUserData: vi.fn(() => self),
    isThereOnline: vi.fn(() => self),
    getAvatar: vi.fn(() => self),
    getFile: vi.fn(() => self),
    getChat: vi.fn(() => self),
    getCategory: vi.fn(() => self),
    getTags: vi.fn(() => self),
    findById: vi.fn(() => self),
    info: vi.fn(() => self),
  }
  return self as unknown as AbrList & AbrCommand
}

function createApp(send: ReturnType<typeof vi.fn>) {
  const lists = {
    department: chain(send),
    chat: chain(send),
    staff: chain(send),
    message: chain(send),
    faq: chain(send),
    predetermined: chain(send),
    support: chain(send),
  }
  const entity = {
    reOpen: vi.fn(() => chain(send)),
    close: vi.fn(() => chain(send)),
    sendMessage: vi.fn(() => chain(send)),
    sendFile: vi.fn(() => chain(send)),
    processing: vi.fn(() => chain(send)),
    convey: vi.fn(() => chain(send)),
    update: vi.fn(() => chain(send)),
    delete: vi.fn(() => chain(send)),
  }
  const aggregate = Object.assign(
    vi.fn(() => entity),
    {
      lists,
      on: vi.fn(async () => ({ cancel: vi.fn() })),
      open: vi.fn(() => chain(send)),
      avail: vi.fn(() => chain(send)),
      unAvail: vi.fn(() => chain(send)),
      add: vi.fn(() => chain(send)),
      update: vi.fn(() => chain(send)),
      seen: vi.fn(() => chain(send)),
    },
  )
  const app = {
    Support: {
      Chat: aggregate,
      Message: aggregate,
      Department: aggregate,
      FAQ: aggregate,
      Predetermined: aggregate,
    },
    User: { Staff: aggregate },
    Mastering: { File: aggregate },
  } as unknown as SupportApp
  return { app, entity, aggregate }
}

describe('reconnect subscriptions and mutation ack', () => {
  it('keys subscriptions by instanceId + key and does not subscribe twice', async () => {
    expect(subscriptionKey('01JINST', 'staff-availability')).toBe('01JINST:staff-availability')

    const registry = createSubscriptionRegistry()
    const first = { cancel: vi.fn() }
    registry.add('01JINST:staff-availability', first)
    expect(registry.has('01JINST:staff-availability')).toBe(true)
    expect(registry.size()).toBe(1)

    const factory = vi.fn(async () => ({ cancel: vi.fn() }))
    const manager = createSessionManager({
      instanceId: '01JINST',
      side: 'user',
      env: { hostname: 'localhost' },
      cookieSource: () => 'user-token=x',
      connect: async () => createApp(vi.fn(async () => [{ id: '1' }])).app,
    })
    await manager.set(1)

    const firstId = await manager.subscribe('staff-availability', factory)
    const secondId = await manager.subscribe('staff-availability', factory)
    expect(firstId).toBe('01JINST:staff-availability')
    expect(secondId).toBe(firstId)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('coalesces concurrent subscribe of the same instanceId+key', async () => {
    let release!: () => void
    const started = new Promise<void>((resolve) => {
      release = resolve
    })
    const factory = vi.fn(async () => {
      await started
      return { cancel: vi.fn() }
    })
    const manager = createSessionManager({
      instanceId: '01JINST',
      side: 'user',
      env: { hostname: 'localhost' },
      cookieSource: () => 'user-token=x',
      connect: async () => createApp(vi.fn(async () => [{ id: '1' }])).app,
    })
    await manager.set(1)

    const first = manager.subscribe('chat-events', factory)
    const second = manager.subscribe('chat-events', factory)
    release()
    expect(await first).toBe(await second)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('does not resend after a backend ack, but retries when the ack is missing', async () => {
    const ledger = createMutationLedger()
    const send = vi.fn(async () => 'ack')

    await Promise.all([ledger.run('send:1', send), ledger.run('send:1', send)])
    expect(send).toHaveBeenCalledTimes(1)
    await ledger.run('send:1', send)
    expect(send).toHaveBeenCalledTimes(1)
    expect(ledger.hasAck('send:1')).toBe(true)

    const failing = vi.fn(async () => {
      throw new Error('network')
    })
    await expect(ledger.run('send:2', failing)).rejects.toThrow('network')
    expect(ledger.hasAck('send:2')).toBe(false)
    const recovered = vi.fn(async () => 'ack')
    await expect(ledger.run('send:2', recovered)).resolves.toBe('ack')
    expect(recovered).toHaveBeenCalledTimes(1)
  })

  it('gateway sendMessage retries only when the previous attempt had no ack', async () => {
    const send = vi.fn(async () => ({ id: 'm1' }))
    const { app, entity } = createApp(send)
    const manager = createSessionManager({
      instanceId: 'gw',
      side: 'user',
      env: { hostname: 'localhost' },
      cookieSource: () => 'user-token=x',
      connect: async () => app,
    })
    await manager.set(1)
    const gateway = createSupportGateway({ session: manager, env: { hostname: 'localhost' } })

    await gateway.sendMessage({
      chat: '11111111-1111-1111-1111-111111111111',
      message: 'hi',
      attemptKey: 'msg-1',
    })
    await gateway.sendMessage({
      chat: '11111111-1111-1111-1111-111111111111',
      message: 'hi',
      attemptKey: 'msg-1',
    })
    expect(entity.sendMessage).toHaveBeenCalledTimes(1)
    expect(manager.hasMutationAck('msg-1')).toBe(true)
  })

  it('clears mutation acks and subscriptions on SESSION_CLEAR so a new generation can send again', async () => {
    const send = vi.fn(async () => ({ id: 'm1' }))
    const { app, entity } = createApp(send)
    const manager = createSessionManager({
      instanceId: 'gw',
      side: 'user',
      env: { hostname: 'localhost' },
      cookieSource: () => 'user-token=x',
      connect: async () => app,
    })
    await manager.set(1)
    const gateway = createSupportGateway({ session: manager })
    await gateway.sendMessage({
      chat: '11111111-1111-1111-1111-111111111111',
      message: 'hi',
      attemptKey: 'msg-clear',
    })
    manager.clear(2)
    expect(manager.hasMutationAck('msg-clear')).toBe(false)

    await manager.set(3)
    await gateway.sendMessage({
      chat: '11111111-1111-1111-1111-111111111111',
      message: 'hi',
      attemptKey: 'msg-clear',
    })
    expect(entity.sendMessage).toHaveBeenCalledTimes(2)
  })
})
