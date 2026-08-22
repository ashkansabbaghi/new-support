import {
  createEnvelope,
  createId,
  PROTOCOL_CHANNEL,
  type HostCommandType,
  type PayloadByType,
  type ProtocolEnvelope,
  type ProtocolMessage,
} from '@nipoto/support-protocol'

import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  DEFAULT_HANDSHAKE_TIMEOUT_MS,
  IFRAME_SANDBOX,
  WIDGET_ID_PATTERN,
} from './constants.js'
import { SupportSdkError } from './errors.js'
import { createFocusHandoff } from './focus.js'
import { createDomContainer, createDomIframe, getHostRootElement } from './iframe.js'
import { inspectIncoming } from './inspect.js'
import { assertLocale, directionForLocale } from './locale.js'
import { exactOrigin } from './origin.js'
import { createCancellablePromise } from './pending.js'
import { showHostNotification } from './notification.js'
import { defaultOpenSize, parseResizeHint } from './resize.js'
import { buildSessionSetPayload, nextSessionGeneration } from './session.js'
import type {
  CommandOptions,
  CreateSupportClientOptions,
  SetSessionInput,
  SupportClient,
  SupportEventHandler,
  SupportHostContainer,
  SupportIframeHandle,
  SupportLifecycleEvent,
} from './types.js'
import { buildModuleEntryUrl } from './url.js'

type Pending = {
  resolve: (value: ProtocolEnvelope<'COMMAND_SUCCEEDED'>) => void
  reject: (error: unknown) => void
}

export function createSupportClient(options: CreateSupportClientOptions): SupportClient {
  const moduleOrigin = exactOrigin(options.origin)
  if (!WIDGET_ID_PATTERN.test(options.widgetId) || options.widgetId.length > 64) {
    throw new SupportSdkError('widget-id is public but must be a safe identifier', 'INVALID_WIDGET_ID')
  }

  const locale = assertLocale(options.locale ?? 'fa-IR')
  const direction = options.direction ?? directionForLocale(locale)
  const side = options.side ?? 'user'
  const theme = options.theme ?? 'system'
  const commandTimeout = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS
  const handshakeTimeout = options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS

  const listeners = new Map<SupportLifecycleEvent, Set<SupportEventHandler<SupportLifecycleEvent>>>()
  const pending = new Map<string, Pending>()
  const seen = new Set<string>()
  const focus = createFocusHandoff()

  let disposed = false
  let instanceId: string | null = null
  let nonce: string | null = null
  let generation = 0
  let opened = false
  let handshakeStarted = false
  let hostInitDone = false
  let port: MessagePort | null = null
  let iframe: SupportIframeHandle | null = null
  let container: SupportHostContainer | null = null
  let removeWindowListener: (() => void) | null = null
  let removeVisibility: (() => void) | null = null
  let removeNetwork: (() => void) | null = null

  const emit = <K extends SupportLifecycleEvent>(event: K, payload: Parameters<SupportEventHandler<K>>[0]) => {
    const set = listeners.get(event)
    if (!set) {
      return
    }
    for (const handler of set) {
      handler(payload as never)
    }
  }

  const failPending = (error: unknown) => {
    for (const item of pending.values()) {
      item.reject(error)
    }
    pending.clear()
  }

  const cleanupPort = () => {
    if (!port) {
      return
    }
    port.removeEventListener('message', onPortMessage)
    port.close()
    port = null
  }

  const postToModule = (data: unknown, transfer?: Transferable[]) => {
    const target = iframe?.contentWindow
    if (!target) {
      throw new SupportSdkError('iframe is not ready', 'NO_IFRAME')
    }
    if (port && !transfer) {
      port.postMessage(data)
      return
    }
    target.postMessage(data, moduleOrigin, transfer)
  }

  const sendProbe = () => {
    if (disposed || nonce) {
      return
    }
    try {
      postToModule({ channel: PROTOCOL_CHANNEL, type: 'HOST_HELLO' })
    } catch {
      // iframe window may not exist yet
    }
  }

  const request = <T extends HostCommandType>(
    type: T,
    payload: PayloadByType[T],
    requestOptions?: CommandOptions & { transfer?: Transferable[] },
  ) => {
    return createCancellablePromise<void>((resolve, reject) => {
      const send = () => {
        if (disposed) {
          reject(new SupportSdkError('client is disposed', 'ALREADY_DISPOSED'))
          return
        }
        if (!instanceId) {
          reject(new SupportSdkError('handshake is not complete', 'NOT_READY'))
          return
        }
        const requestId = createId()
        const envelope = createEnvelope({
          instanceId,
          type,
          payload,
          requestId,
        })
        pending.set(requestId, {
          resolve: () => resolve(),
          reject,
        })
        try {
          postToModule(envelope, requestOptions?.transfer)
        } catch (error) {
          pending.delete(requestId)
          reject(error)
        }
      }

      if (type === 'HOST_INIT' || hostInitDone) {
        send()
        return
      }
      void ready.then(send, reject)
    }, {
      timeoutMs: requestOptions?.timeoutMs ?? commandTimeout,
      signal: requestOptions?.signal,
    })
  }

  const handleEnvelope = (envelope: ProtocolMessage, raw: unknown) => {
    if (seen.has(envelope.messageId)) {
      return
    }
    seen.add(envelope.messageId)
    if (seen.size > 256) {
      const first = seen.values().next().value
      if (first) {
        seen.delete(first)
      }
    }

    if (envelope.type === 'COMMAND_SUCCEEDED' || envelope.type === 'COMMAND_FAILED') {
      const requestId = envelope.requestId
      if (requestId && pending.has(requestId)) {
        const item = pending.get(requestId)
        pending.delete(requestId)
        if (envelope.type === 'COMMAND_FAILED') {
          item?.reject(
            new SupportSdkError(envelope.payload.code, envelope.payload.code, envelope.payload.retryable),
          )
          return
        }
        item?.resolve(envelope)
      }
    }

    switch (envelope.type) {
      case 'MODULE_READY':
        nonce = envelope.payload.nonce
        instanceId = envelope.instanceId
        void startHandshake(envelope)
        emit('ready', envelope)
        break
      case 'MODULE_INITIALIZED':
        emit('initialized', envelope)
        break
      case 'MODULE_OPENED': {
        const alreadyOpen = opened
        opened = true
        const size = parseResizeHint(raw) ?? defaultOpenSize()
        container?.applyOpen(size)
        if (!alreadyOpen) {
          focus.enter(iframe)
          emit('opened', envelope)
        }
        emit('resize', size)
        break
      }
      case 'MODULE_CLOSED':
        opened = false
        container?.applyClose()
        focus.restore()
        emit('closed', envelope)
        break
      case 'MODULE_DISPOSED':
        emit('disposed', envelope)
        break
      case 'AUTH_REQUIRED':
        emit('auth-required', envelope)
        break
      case 'MODULE_ERROR':
        emit('error', envelope)
        break
      case 'UNREAD_COUNT_CHANGED':
        emit('unread', envelope)
        break
      case 'ROUTE_CHANGED':
        emit('route-changed', envelope)
        break
      case 'CONVERSATION_STATE_CHANGED':
        emit('conversation-state', envelope)
        break
      case 'NOTIFICATION_REQUESTED':
        emit('notification', envelope)
        showHostNotification(envelope.payload)
        break
      case 'EXTERNAL_NAVIGATION_REQUESTED':
        emit('external-navigation', envelope)
        break
      default:
        break
    }

    const resize = parseResizeHint(raw)
    if (resize && envelope.type !== 'MODULE_OPENED') {
      if (opened) {
        container?.applyOpen(resize)
      }
      emit('resize', resize)
    }
  }

  const handleIncoming = (event: { data: unknown; origin: string; source: unknown }, viaPort: boolean) => {
    if (disposed) {
      return
    }
    const inspected = inspectIncoming({
      data: event.data,
      origin: event.origin,
      source: event.source,
      expectedOrigin: moduleOrigin,
      expectedSource: iframe?.contentWindow ?? null,
      expectedInstanceId: instanceId ?? undefined,
      viaPort,
    })
    if (!inspected.ok) {
      return
    }
    handleEnvelope(inspected.envelope, event.data)
  }

  const onWindowMessage = (event: MessageEvent) => {
    handleIncoming(event, false)
  }

  function onPortMessage(event: MessageEvent) {
    handleIncoming({ data: event.data, origin: '', source: port }, true)
  }

  const startHandshake = async (readyEnvelope: ProtocolEnvelope<'MODULE_READY'>) => {
    if (disposed || handshakeStarted) {
      return
    }
    handshakeStarted = true
    cleanupPort()
    const channel = typeof MessageChannel === 'function' ? new MessageChannel() : null
    if (channel) {
      port = channel.port1
      port.addEventListener('message', onPortMessage)
      port.start()
    }

    const hostInfo = {
      appId: options.host?.appId ?? options.widgetId,
      appVersion: options.host?.appVersion ?? '0.0.0',
      branding: options.host?.branding ?? { brandId: options.widgetId },
      platform: options.host?.platform ?? 'web',
    }

    try {
      await request(
        'HOST_INIT',
        {
          nonce: readyEnvelope.payload.nonce,
          side,
          locale,
          direction,
          theme,
          initialRoute: {
            name: options.initialRouteName ?? (side === 'staff' ? 'ticket.list' : 'conversation.home'),
          },
          host: hostInfo,
        },
        {
          timeoutMs: handshakeTimeout,
          transfer: channel ? [channel.port2] : undefined,
        },
      )
      hostInitDone = true
      clearTimeout(handshakeTimer)
      bindHostLifecycle()
      resolveReady()
    } catch (error) {
      cleanupPort()
      emit('error', {
        code: error instanceof SupportSdkError ? error.code : 'INTERNAL',
        message: error instanceof Error ? error.message : 'handshake failed',
      })
      rejectReady(error)
    }
  }

  const bindHostLifecycle = () => {
    if (typeof document !== 'undefined') {
      const onVisibility = () => {
        if (disposed || !instanceId) {
          return
        }
        void request(document.visibilityState === 'hidden' ? 'HOST_BACKGROUND' : 'HOST_FOREGROUND', {}).catch(
          () => undefined,
        )
      }
      document.addEventListener('visibilitychange', onVisibility)
      removeVisibility = () => document.removeEventListener('visibilitychange', onVisibility)
    }
    if (typeof window !== 'undefined') {
      const onOnline = () => {
        if (disposed || !instanceId) {
          return
        }
        void request('NETWORK_STATUS_CHANGED', { online: true }).catch(() => undefined)
      }
      const onOffline = () => {
        if (disposed || !instanceId) {
          return
        }
        void request('NETWORK_STATUS_CHANGED', { online: false }).catch(() => undefined)
      }
      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)
      removeNetwork = () => {
        window.removeEventListener('online', onOnline)
        window.removeEventListener('offline', onOffline)
      }
    }
  }

  let resolveReady: () => void = () => undefined
  let rejectReady: (error: unknown) => void = () => undefined
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })

  const src = buildModuleEntryUrl(moduleOrigin, { widgetId: options.widgetId, locale })

  if (options.hooks?.addWindowListener) {
    removeWindowListener = options.hooks.addWindowListener(onWindowMessage)
  } else if (typeof window !== 'undefined') {
    window.addEventListener('message', onWindowMessage)
    removeWindowListener = () => window.removeEventListener('message', onWindowMessage)
  } else {
    throw new SupportSdkError('window is required to embed the module', 'NO_DOM')
  }

  if (options.hooks?.mountContainer) {
    container = options.hooks.mountContainer()
  } else if (typeof document !== 'undefined') {
    container = createDomContainer(options.container)
  } else if (!options.hooks?.createIframe) {
    throw new SupportSdkError('document is required to embed the module', 'NO_DOM')
  }

  const mountTarget = getHostRootElement(container) ?? options.container

  if (options.hooks?.createIframe) {
    iframe = options.hooks.createIframe({
      src,
      sandbox: IFRAME_SANDBOX,
      title: 'Nipoto Support',
      onLoad: sendProbe,
    })
  } else if (typeof document !== 'undefined' && mountTarget) {
    iframe = createDomIframe({
      src,
      sandbox: IFRAME_SANDBOX,
      title: 'Nipoto Support',
      container: mountTarget,
      onLoad: sendProbe,
    })
  } else {
    throw new SupportSdkError('cannot create iframe', 'NO_IFRAME')
  }

  const handshakeTimer = setTimeout(() => {
    if (!hostInitDone && !disposed) {
      const error = new SupportSdkError('handshake timed out', 'TIMEOUT', true)
      emit('error', { code: 'TIMEOUT', message: error.message })
      rejectReady(error)
    }
  }, handshakeTimeout)

  const on = <K extends SupportLifecycleEvent>(event: K, handler: SupportEventHandler<K>) => {
    const set = listeners.get(event) ?? new Set()
    set.add(handler as SupportEventHandler<SupportLifecycleEvent>)
    listeners.set(event, set)
    return () => {
      set.delete(handler as SupportEventHandler<SupportLifecycleEvent>)
    }
  }

  const client: SupportClient = {
    ready,
    open(payload = {}, commandOptions) {
      return request('MODULE_OPEN', payload, commandOptions)
    },
    close(commandOptions) {
      return request('MODULE_CLOSE', { reason: 'host-requested' }, commandOptions)
    },
    setSession(input?: SetSessionInput, commandOptions?: CommandOptions) {
      const next = nextSessionGeneration(generation, input)
      const sent = request('SESSION_SET', buildSessionSetPayload(next, input), commandOptions)
      const tracked = sent.then(() => {
        generation = next
      }) as typeof sent
      tracked.cancel = sent.cancel
      return tracked
    },
    navigate(payload, commandOptions) {
      return request('NAVIGATE', payload, commandOptions)
    },
    dispose(commandOptions) {
      const finish = () => {
        disposed = true
        clearTimeout(handshakeTimer)
        failPending(new SupportSdkError('client is disposed', 'ALREADY_DISPOSED'))
        cleanupPort()
        removeWindowListener?.()
        removeWindowListener = null
        removeVisibility?.()
        removeVisibility = null
        removeNetwork?.()
        removeNetwork = null
        iframe?.remove()
        iframe = null
        container?.dispose()
        container = null
        focus.clear()
        listeners.clear()
        seen.clear()
      }

      if (!instanceId || disposed) {
        finish()
        const done = Promise.resolve() as ReturnType<SupportClient['dispose']>
        done.cancel = () => undefined
        return done
      }

      const sent = request('DISPOSE', { reason: 'host-requested' }, commandOptions)
      const tracked = sent.finally(finish) as typeof sent
      tracked.cancel = sent.cancel
      return tracked
    },
    on,
    focus() {
      focus.enter(iframe)
    },
    returnFocus() {
      focus.restore()
    },
    getIframe() {
      return iframe
    },
  }

  return client
}
