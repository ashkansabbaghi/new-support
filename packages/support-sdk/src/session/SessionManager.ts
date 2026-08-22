import { createAbrApp, disconnectAbrApp } from '../abr/createAbrApp.js'
import type { AbrSubscription, SupportApp } from '../app.js'
import { getAuthToken, hasAuthCookie } from '../auth/cookies.js'
import { createObjectUrlRegistry } from '../cache/ObjectUrlRegistry.js'
import { resolveBackend, type BackendEnvInput, type ResolvedBackend } from '../env/resolveBackend.js'
import { resolveLoginUrl } from '../env/loginUrl.js'
import { mapUserNotification, type DomainEvent } from '../realtime/events.js'
import { createMutationLedger } from '../realtime/MutationLedger.js'
import { createSubscriptionRegistry, subscriptionKey } from '../realtime/SubscriptionRegistry.js'
import { cookieNameForSide, inferSideFromHostname, type AuthCookieName, type SupportSide } from '../side.js'

export type AuthRequiredReason = 'unauthorized' | 'expired' | 'missing' | 'revoked'

export type SessionSnapshot = {
  generation: number
  hasSession: boolean
  connected: boolean
  side: SupportSide
  cookieName: AuthCookieName
  backendHost: string
  restUrl: string
  wsUrl: string
  loginUrl: string
  hasCookie: boolean
}

export type SessionManagerHooks = {
  onAuthRequired?: (reason: AuthRequiredReason, generation: number) => void
  onReconcile?: (generation: number) => void
  onDomainEvent?: (event: DomainEvent) => void
  onStateChange?: (snapshot: SessionSnapshot) => void
}

export type ConnectApp = (ctx: {
  wsUrl: string
  side: SupportSide
  generation: number
}) => Promise<SupportApp>

export type SessionManagerOptions = {
  instanceId: string
  side?: SupportSide
  env?: BackendEnvInput
  connect?: ConnectApp
  hooks?: SessionManagerHooks
  cookieSource?: () => string
  hostname?: () => string
}

export type HostSessionSetPayload = {
  generation: number
  credential?: { scheme?: string; value?: string }
}

function defaultHostname(): string {
  return typeof window === 'undefined' ? 'localhost' : window.location.hostname
}

/**
 * In-memory session only. Cookie is the V1 credential.
 * SESSION_SET is a generation bump / “host says a session exists”, not a token store.
 */
export function createSessionManager(options: SessionManagerOptions) {
  const instanceId = options.instanceId
  const subscriptions = createSubscriptionRegistry()
  const mutations = createMutationLedger()
  const objectUrls = createObjectUrlRegistry()
  const cache = new Map<string, unknown>()
  const stateListeners = new Set<(snapshot: SessionSnapshot) => void>()
  const subscribeInflight = new Map<string, Promise<string>>()

  let generation = 0
  let hasSession = false
  let connected = false
  let side: SupportSide = options.side ?? inferSideFromHostname(options.hostname?.() ?? defaultHostname())
  let app: SupportApp | null = null
  let authRequiredForGeneration: number | null = null
  let busCancels: Array<{ cancel?: () => void }> = []
  let connectEpoch = 0

  const hooks: SessionManagerHooks = { ...options.hooks }

  function envInput(): BackendEnvInput {
    return {
      ...options.env,
      hostname: options.hostname?.() ?? options.env?.hostname ?? defaultHostname(),
    }
  }

  function backend(): ResolvedBackend {
    return resolveBackend(envInput())
  }

  function cookieText(): string {
    return options.cookieSource?.() ?? (typeof document === 'undefined' ? '' : document.cookie)
  }

  function snapshot(): SessionSnapshot {
    const resolved = backend()
    return {
      generation,
      hasSession,
      connected,
      side,
      cookieName: cookieNameForSide(side),
      backendHost: resolved.host,
      restUrl: resolved.restUrl,
      wsUrl: resolved.wsUrl,
      loginUrl: resolveLoginUrl(side, options.hostname?.() ?? defaultHostname()),
      hasCookie: hasAuthCookie(side, cookieText()),
    }
  }

  function emitState(): void {
    const next = snapshot()
    hooks.onStateChange?.(next)
    for (const listener of stateListeners) {
      listener(next)
    }
  }

  function dropVolatileState(): void {
    subscriptions.clear()
    subscribeInflight.clear()
    mutations.clear()
    objectUrls.revokeAll()
    cache.clear()
    for (const cancel of busCancels) {
      try {
        cancel.cancel?.()
      } catch {
        // ignore
      }
    }
    busCancels = []
  }

  function teardownConnection(): void {
    dropVolatileState()
    disconnectAbrApp(app)
    app = null
    connected = false
  }

  function emitAuthRequired(reason: AuthRequiredReason): void {
    if (authRequiredForGeneration === generation) {
      return
    }
    authRequiredForGeneration = generation
    hooks.onAuthRequired?.(reason, generation)
    emitState()
  }

  function isCurrent(expectedGeneration: number): boolean {
    return hasSession && expectedGeneration === generation
  }

  function emitDomain(event: DomainEvent): void {
    if (!isCurrent(event.generation)) {
      return
    }
    hooks.onDomainEvent?.(event)
  }

  function attachBus(nextApp: SupportApp, expectedGeneration: number): void {
    const bus = nextApp.$abr?.bus
    if (!bus?.subscribe) {
      return
    }

    const tokenRemoved = bus.subscribe('tokenRemoved', () => {
      if (!isCurrent(expectedGeneration)) {
        return
      }
      connected = false
      emitAuthRequired('revoked')
      teardownConnection()
    })
    busCancels.push(tokenRemoved)

    const reconnected = bus.subscribe('socketReconnected', () => {
      if (!isCurrent(expectedGeneration)) {
        return
      }
      hooks.onReconcile?.(expectedGeneration)
    })
    busCancels.push(reconnected)

    const notifications = bus.subscribe('userNotification', (data) => {
      const mapped = mapUserNotification(data, expectedGeneration)
      if (mapped) {
        emitDomain(mapped)
      }
    })
    busCancels.push(notifications)
  }

  async function connect(expectedGeneration: number): Promise<void> {
    const epoch = ++connectEpoch
    teardownConnection()

    if (!hasAuthCookie(side, cookieText())) {
      emitAuthRequired('missing')
      emitState()
      return
    }

    const resolved = backend()
    const connectApp =
      options.connect ??
      ((ctx) =>
        createAbrApp({
          wsUrl: ctx.wsUrl,
          side: ctx.side,
          hostname: options.hostname?.() ?? defaultHostname(),
        }))

    try {
      const nextApp = await connectApp({
        wsUrl: resolved.wsUrl,
        side,
        generation: expectedGeneration,
      })
      if (epoch !== connectEpoch || !isCurrent(expectedGeneration)) {
        disconnectAbrApp(nextApp)
        return
      }
      app = nextApp
      connected = true
      attachBus(nextApp, expectedGeneration)
      emitState()
    } catch (error) {
      if (epoch !== connectEpoch || !isCurrent(expectedGeneration)) {
        return
      }
      connected = false
      if (isAuthFailure(error)) {
        emitAuthRequired('unauthorized')
      }
      emitState()
      throw error
    }
  }

  async function set(nextGeneration: number): Promise<boolean> {
    if (nextGeneration <= generation) {
      return false
    }
    generation = nextGeneration
    hasSession = true
    authRequiredForGeneration = null
    emitState()
    await connect(nextGeneration)
    return true
  }

  const manager = {
    set,
    /**
     * Host SESSION_SET. Never persist `credential.value` — cookie remains source of truth.
     */
    async setFromHost(payload: HostSessionSetPayload): Promise<boolean> {
      void payload.credential
      return set(payload.generation)
    },
    clear(nextGeneration: number): void {
      if (nextGeneration <= generation) {
        return
      }
      generation = nextGeneration
      hasSession = false
      authRequiredForGeneration = null
      connectEpoch += 1
      teardownConnection()
      emitState()
    },
    dispose(): void {
      connectEpoch += 1
      hasSession = false
      generation = 0
      authRequiredForGeneration = null
      teardownConnection()
      emitState()
    },
    setSide(next: SupportSide): void {
      side = next
      emitState()
    },
    setAuthRequiredHandler(handler: SessionManagerHooks['onAuthRequired']): void {
      hooks.onAuthRequired = handler
    },
    setHooks(next: SessionManagerHooks): void {
      Object.assign(hooks, next)
    },
    getGeneration(): number {
      return generation
    },
    hasSession(): boolean {
      return hasSession
    },
    isConnected(): boolean {
      return connected
    },
    isCurrentGeneration(expected: number): boolean {
      return isCurrent(expected)
    },
    getSide(): SupportSide {
      return side
    },
    getApp(): SupportApp | null {
      return app
    },
    requireApp(): SupportApp {
      if (!app) {
        throw new Error('[SessionManager] $app is not connected')
      }
      return app
    },
    getSnapshot(): SessionSnapshot {
      return snapshot()
    },
    /**
     * Phase 4 authToken pattern: user-token / staff-token from the in-memory
     * cookie source. Host-supplied SESSION_SET tokens are never used.
     */
    getAuthorization(): string | undefined {
      return getAuthToken(side, options.hostname?.() ?? defaultHostname(), cookieText())
    },
    getCache(): Map<string, unknown> {
      return cache
    },
    registerObjectUrl(url: string): string {
      return objectUrls.add(url)
    },
    subscriptionId(key: string): string {
      return subscriptionKey(instanceId, key)
    },
    async subscribe(key: string, factory: () => Promise<AbrSubscription>): Promise<string> {
      const id = subscriptionKey(instanceId, key)
      if (subscriptions.has(id)) {
        return id
      }
      const pending = subscribeInflight.get(id)
      if (pending) {
        return pending
      }
      const work = (async () => {
        if (subscriptions.has(id)) {
          return id
        }
        const created = await factory()
        if (subscriptions.has(id)) {
          created.cancel?.()
          return id
        }
        subscriptions.add(id, created)
        return id
      })().finally(() => {
        subscribeInflight.delete(id)
      })
      subscribeInflight.set(id, work)
      return work
    },
    /**
     * Coalesce a backend mutation. After an ack, retry is a no-op.
     * If the send fails (ack missing), a later call with the same key may send again.
     */
    runMutation<T>(key: string, send: () => Promise<T>): Promise<T> {
      return mutations.run(key, send)
    },
    hasMutationAck(key: string): boolean {
      return mutations.hasAck(key)
    },
    unsubscribe(key: string): void {
      subscriptions.remove(subscriptionKey(instanceId, key))
    },
    notifyAuthRequired(reason: AuthRequiredReason): void {
      if (reason === 'unauthorized' || reason === 'expired' || reason === 'revoked') {
        connected = false
      }
      emitAuthRequired(reason)
    },
    emitDomainEvent(name: string, data: unknown): void {
      emitDomain({ source: 'aggregate', name, generation, data })
    },
    onStateChange(listener: (next: SessionSnapshot) => void): () => void {
      stateListeners.add(listener)
      return () => {
        stateListeners.delete(listener)
      }
    },
    get instanceId(): string {
      return instanceId
    },
  }

  return manager
}

export type SessionManager = ReturnType<typeof createSessionManager>

export function isAuthFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const record = error as { status?: unknown; statusCode?: unknown; code?: unknown; message?: unknown }
  if (record.status === 401 || record.statusCode === 401) {
    return true
  }
  if (typeof record.code === 'string' && /401|unauthor/i.test(record.code)) {
    return true
  }
  if (typeof record.message === 'string' && /401|unauthor|token/i.test(record.message)) {
    return true
  }
  return false
}
