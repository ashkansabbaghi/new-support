import type { HOST_INITPayload, PayloadByType, ProtocolEnvelope } from '@nipoto/support-protocol'

export type MODULE_OPENPayload = PayloadByType['MODULE_OPEN']
export type NAVIGATEPayload = PayloadByType['NAVIGATE']

export type SupportSide = 'user' | 'staff'
export type SupportTheme = 'light' | 'dark' | 'system'
export type SupportDirection = 'ltr' | 'rtl'

export type CommandOptions = {
  timeoutMs?: number
  signal?: AbortSignal
}

export type SetSessionInput = {
  generation?: number
}

export type CancellablePromise<T> = Promise<T> & { cancel: (reason?: string) => void }

export type SupportLifecycleEvent =
  | 'ready'
  | 'initialized'
  | 'opened'
  | 'closed'
  | 'disposed'
  | 'auth-required'
  | 'error'
  | 'resize'
  | 'unread'
  | 'route-changed'
  | 'conversation-state'
  | 'notification'
  | 'external-navigation'

export type SupportEventMap = {
  ready: ProtocolEnvelope<'MODULE_READY'>
  initialized: ProtocolEnvelope<'MODULE_INITIALIZED'>
  opened: ProtocolEnvelope<'MODULE_OPENED'>
  closed: ProtocolEnvelope<'MODULE_CLOSED'>
  disposed: ProtocolEnvelope<'MODULE_DISPOSED'>
  'auth-required': ProtocolEnvelope<'AUTH_REQUIRED'>
  error: ProtocolEnvelope<'MODULE_ERROR'> | { code: string; message: string }
  resize: { width: number; height: number }
  unread: ProtocolEnvelope<'UNREAD_COUNT_CHANGED'>
  'route-changed': ProtocolEnvelope<'ROUTE_CHANGED'>
  'conversation-state': ProtocolEnvelope<'CONVERSATION_STATE_CHANGED'>
  notification: ProtocolEnvelope<'NOTIFICATION_REQUESTED'>
  'external-navigation': ProtocolEnvelope<'EXTERNAL_NAVIGATION_REQUESTED'>
}

export type SupportEventHandler<K extends SupportLifecycleEvent> = (payload: SupportEventMap[K]) => void

export type HostAppInfo = HOST_INITPayload['host']

export type CreateSupportClientOptions = {
  origin: string
  widgetId: string
  locale?: string
  direction?: SupportDirection
  side?: SupportSide
  theme?: SupportTheme
  initialRouteName?: HOST_INITPayload['initialRoute']['name']
  host?: Partial<HostAppInfo>
  container?: HTMLElement
  timeoutMs?: number
  handshakeTimeoutMs?: number
  hooks?: SupportClientHooks
}

export type SupportClientHooks = {
  createIframe?: (input: {
    src: string
    sandbox: string
    title: string
    onLoad: () => void
  }) => SupportIframeHandle
  addWindowListener?: (listener: (event: MessageEvent) => void) => () => void
  mountContainer?: () => SupportHostContainer
}

export type SupportIframeHandle = {
  focus(): void
  remove(): void
  contentWindow: {
    postMessage: (data: unknown, targetOrigin: string, transfer?: Transferable[]) => void
    focus(): void
  } | null
}

export type SupportHostContainer = {
  applyOpen(size: { width: number; height: number }): void
  applyClose(): void
  dispose(): void
  element?: HTMLElement
}

export type SupportClient = {
  readonly ready: Promise<void>
  open(payload?: MODULE_OPENPayload, options?: CommandOptions): CancellablePromise<void>
  close(options?: CommandOptions): CancellablePromise<void>
  setSession(input?: SetSessionInput, options?: CommandOptions): CancellablePromise<void>
  navigate(payload: NAVIGATEPayload, options?: CommandOptions): CancellablePromise<void>
  dispose(options?: CommandOptions): CancellablePromise<void>
  on<K extends SupportLifecycleEvent>(event: K, handler: SupportEventHandler<K>): () => void
  focus(): void
  returnFocus(): void
  getIframe(): SupportIframeHandle | null
}
