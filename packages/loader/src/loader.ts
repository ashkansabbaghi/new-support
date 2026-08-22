import {
  createSupportClient,
  defineNipotoSupportModule,
  HOST_ROOT_ID,
  HOST_STYLE_ID,
  type NAVIGATEPayload,
  type SupportClient,
  type SupportLifecycleEvent,
} from '@nipoto/support-web-sdk'

/** Compatible with the current and previous protocol minor of the same major. */

export type NipotoSupportAPI = {
  init(options?: LoaderInitOptions): Promise<void>
  open(): Promise<void>
  close(): Promise<void>
  setSession(input?: { generation?: number }): Promise<void>
  navigate(payload: NAVIGATEPayload): Promise<void>
  destroy(): Promise<void>
  on(event: SupportLifecycleEvent, handler: (payload: unknown) => void): () => void
}

export type LoaderInitOptions = {
  widgetId?: string
  locale?: string
  origin?: string
  side?: 'user' | 'staff'
}

type Listener = (payload: unknown) => void

const globalListeners = new Map<SupportLifecycleEvent, Set<Listener>>()
let client: SupportClient | null = null
let initPromise: Promise<void> | null = null

function findLoaderScript(): HTMLScriptElement | null {
  if (typeof document === 'undefined') {
    return null
  }
  if (document.currentScript instanceof HTMLScriptElement) {
    return document.currentScript
  }
  return document.querySelector('script[data-widget-id]')
}

function bakedOrigin(): string {
  return typeof __NIPOTO_MODULE_ORIGIN__ === 'string' && __NIPOTO_MODULE_ORIGIN__
    ? __NIPOTO_MODULE_ORIGIN__
    : 'http://localhost:5173'
}

function emit(event: SupportLifecycleEvent, payload: unknown): void {
  const set = globalListeners.get(event)
  if (!set) {
    return
  }
  for (const handler of set) {
    handler(payload)
  }
}

function attachClientEvents(next: SupportClient): void {
  const events: SupportLifecycleEvent[] = [
    'ready',
    'initialized',
    'opened',
    'closed',
    'disposed',
    'auth-required',
    'error',
    'resize',
    'unread',
    'route-changed',
    'conversation-state',
    'notification',
    'external-navigation',
  ]
  for (const event of events) {
    next.on(event, (payload) => emit(event, payload))
  }
}

function requireClient(): SupportClient {
  if (!client) {
    throw new Error('[NipotoSupport] call init() first')
  }
  return client
}

async function init(options: LoaderInitOptions = {}): Promise<void> {
  if (client) {
    await client.ready
    return
  }
  if (initPromise) {
    await initPromise
    return
  }

  const script = findLoaderScript()
  const widgetId = options.widgetId ?? script?.dataset.widgetId
  const locale = options.locale ?? script?.dataset.locale ?? 'fa-IR'
  const origin = options.origin ?? script?.dataset.origin ?? bakedOrigin()
  const side = options.side ?? (script?.dataset.side === 'staff' ? 'staff' : 'user')

  if (!widgetId) {
    throw new Error('[NipotoSupport] data-widget-id is required (public tenant id, not a secret)')
  }

  initPromise = (async () => {
    defineNipotoSupportModule()
    const created = createSupportClient({
      origin,
      widgetId,
      locale,
      side,
    })
    attachClientEvents(created)
    client = created
    await created.ready
  })()

  try {
    await initPromise
  } catch (error) {
    client = null
    initPromise = null
    throw error
  }
}

async function open(): Promise<void> {
  await init()
  await requireClient().open()
}

async function close(): Promise<void> {
  await requireClient().close()
}

async function setSession(input?: { generation?: number }): Promise<void> {
  await init()
  await requireClient().setSession(input)
}

async function navigate(payload: NAVIGATEPayload): Promise<void> {
  await requireClient().navigate(payload)
}

async function destroy(): Promise<void> {
  if (!client) {
    removeLeftoverHostArtifacts()
    return
  }
  const current = client
  client = null
  initPromise = null
  await current.dispose()
  removeLeftoverHostArtifacts()
}

function removeLeftoverHostArtifacts(): void {
  if (typeof document === 'undefined') {
    return
  }
  document.getElementById(HOST_ROOT_ID)?.remove()
  document.getElementById(HOST_STYLE_ID)?.remove()
}

function on(event: SupportLifecycleEvent, handler: Listener): () => void {
  const set = globalListeners.get(event) ?? new Set()
  set.add(handler)
  globalListeners.set(event, set)
  return () => {
    set.delete(handler)
  }
}

export const NipotoSupport: NipotoSupportAPI = {
  init,
  open,
  close,
  setSession,
  navigate,
  destroy,
  on,
}

function boot(): void {
  const script = findLoaderScript()
  if (!script?.dataset.widgetId) {
    return
  }
  void init().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'init failed'
    emit('error', { code: 'INIT_FAILED', message })
  })
}

if (typeof window !== 'undefined') {
  ;(window as Window & { NipotoSupport?: NipotoSupportAPI }).NipotoSupport = NipotoSupport
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true })
  } else {
    boot()
  }
}
