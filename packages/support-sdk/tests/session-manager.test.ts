import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SupportApp } from '../src/app.js'
import { createSessionManager } from '../src/session/SessionManager.js'

function mockApp(): SupportApp {
  const subscribers = new Map<string, (data: unknown) => void>()
  return {
    Support: {} as SupportApp['Support'],
    User: {} as SupportApp['User'],
    Mastering: {} as SupportApp['Mastering'],
    $abr: {
      bus: {
        subscribe(eventName, callback) {
          subscribers.set(eventName, callback)
          return {
            cancel() {
              subscribers.delete(eventName)
            },
          }
        },
      },
      socket: {
        ws: { close: vi.fn() },
        reconnectTimeoutId: undefined,
      },
    },
  }
}

function createManager(cookie = 'user-token=Bearer%20abc') {
  const apps: SupportApp[] = []
  const authReasons: string[] = []
  const manager = createSessionManager({
    instanceId: '01JTEST',
    side: 'user',
    env: { hostname: 'localhost', abrUrl: 'b1-back.nipoto.pro' },
    hostname: () => 'localhost',
    cookieSource: () => cookie,
    connect: async () => {
      const app = mockApp()
      apps.push(app)
      return app
    },
    hooks: {
      onAuthRequired(reason) {
        authReasons.push(reason)
      },
    },
  })
  return { manager, apps, authReasons }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SessionManager set/clear/generation', () => {
  it('accepts a higher generation and connects by reading the cookie', async () => {
    const { manager, apps } = createManager()
    await expect(manager.set(1)).resolves.toBe(true)
    expect(manager.getGeneration()).toBe(1)
    expect(manager.hasSession()).toBe(true)
    expect(manager.isConnected()).toBe(true)
    expect(apps).toHaveLength(1)
  })

  it('rejects a stale or equal generation', async () => {
    const { manager, apps } = createManager()
    await manager.set(2)
    await expect(manager.set(2)).resolves.toBe(false)
    await expect(manager.set(1)).resolves.toBe(false)
    expect(apps).toHaveLength(1)
    expect(manager.getGeneration()).toBe(2)
  })

  it('treats SESSION_SET credential as unused and does not keep the token', async () => {
    const { manager } = createManager()
    await manager.setFromHost({
      generation: 1,
      credential: { scheme: 'bearer', value: 'super-secret-host-token' },
    })

    expect(JSON.stringify(manager.getSnapshot())).not.toContain('super-secret-host-token')
    expect(manager.getSnapshot().cookieName).toBe('user-token')
    expect(manager.getCache().size).toBe(0)
  })

  it('reconnects on a higher-generation set and tears down the previous $app', async () => {
    const { manager, apps } = createManager()
    await manager.set(1)
    await manager.set(2)
    expect(apps).toHaveLength(2)
    expect(apps[0]?.$abr?.socket?.ws?.close).toHaveBeenCalled()
    expect(manager.getGeneration()).toBe(2)
    expect(manager.getApp()).toBe(apps[1])
  })

  it('clear bumps generation, disconnects, and drops session', async () => {
    const { manager, apps } = createManager()
    await manager.set(1)
    const objectUrl = manager.registerObjectUrl('blob:test')
    expect(objectUrl).toBe('blob:test')
    manager.getCache().set('list', [{ id: '1' }])

    manager.clear(2)
    expect(manager.getGeneration()).toBe(2)
    expect(manager.hasSession()).toBe(false)
    expect(manager.isConnected()).toBe(false)
    expect(manager.getApp()).toBeNull()
    expect(manager.getCache().size).toBe(0)
    expect(apps[0]?.$abr?.socket?.ws?.close).toHaveBeenCalled()
  })

  it('ignores a stale clear', async () => {
    const { manager } = createManager()
    await manager.set(5)
    manager.clear(3)
    expect(manager.getGeneration()).toBe(5)
    expect(manager.hasSession()).toBe(true)
  })

  it('ignores late events after clear / generation bump', async () => {
    const events: string[] = []
    const { manager } = createManager()
    manager.setHooks({
      onDomainEvent(event) {
        events.push(event.name)
      },
    })
    await manager.set(1)
    manager.clear(2)
    manager.emitDomainEvent('messageSent', { text: 'late' })
    expect(events).toEqual([])
  })

  it('does not delete host cookies on clear', async () => {
    const { manager } = createManager()
    await manager.set(1)
    manager.clear(2)
    expect(manager.getSnapshot().cookieName).toBe('user-token')
    expect(createSessionManager.toString()).not.toContain('removeToken')
  })

  it('emits AUTH_REQUIRED once when the cookie is missing', async () => {
    const { manager, authReasons, apps } = createManager('')
    await manager.set(1)
    await manager.set(1)
    expect(authReasons).toEqual(['missing'])
    expect(apps).toHaveLength(0)
    expect(manager.hasSession()).toBe(true)
    expect(manager.isConnected()).toBe(false)
  })

  it('does not write credentials to web storage', async () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem, getItem: vi.fn(), removeItem: vi.fn() })
    vi.stubGlobal('sessionStorage', { setItem, getItem: vi.fn(), removeItem: vi.fn() })
    const { manager } = createManager()
    await manager.setFromHost({
      generation: 1,
      credential: { scheme: 'bearer', value: 'must-not-persist' },
    })
    manager.clear(2)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('dispose resets generation and disconnects', async () => {
    const { manager } = createManager()
    await manager.set(4)
    manager.dispose()
    expect(manager.getGeneration()).toBe(0)
    expect(manager.hasSession()).toBe(false)
    expect(manager.getApp()).toBeNull()
  })

  it('reads authorization from the in-memory cookie source and revokes object URLs on clear', async () => {
    const revoke = vi.fn()
    vi.stubGlobal('URL', { revokeObjectURL: revoke, createObjectURL: vi.fn() })
    const { manager } = createManager('user-token=in-memory-secret')
    await manager.set(1)
    expect(manager.getAuthorization()).toBe('in-memory-secret')
    manager.registerObjectUrl('blob:support-file')
    manager.clear(2)
    expect(revoke).toHaveBeenCalledWith('blob:support-file')
    manager.dispose()
  })
})
