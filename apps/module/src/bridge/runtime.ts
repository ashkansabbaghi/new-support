import {
  createEnvelope,
  createId,
  createSafeLogger,
  entryUrlContainsToken,
  FAILURE_CATEGORY_BY_CODE,
  HandshakeMachine,
  HOST_COMMAND_TYPES,
  isRetryable,
  processHostMessage,
  PROTOCOL_CHANNEL,
  type FailureCode,
  type HandshakeOutput,
  type HostCommandType,
  type LifecycleState,
  type ProtocolEnvelope,
  type SafeLogSink,
  type ValidationFailure,
} from '@nipoto/support-protocol'

import { ensureSessionManager } from '../gateway/runtime'
import { bindRouterBridge } from '../router/navigation'
import {
  applyBackRequested,
  applyCommandToApplication,
  bindApplicationToSession,
  bindExternalNavigation,
  captureEntryRoute,
  bindConversationStateSink,
} from './host-side-effects'
import { setNotificationSink, setResizeSink, setUnreadCountSink } from '@/application'
import { createWindowTransport, type BridgeTransport } from './transport'

const hostCommandSet = new Set<string>(HOST_COMMAND_TYPES)

export const MODULE_VERSION = '0.0.0'

export type InitBridgeOptions = {
  transport?: BridgeTransport
  allowedOrigins?: readonly string[]
  logger?: SafeLogSink
  moduleVersion?: string
}

export type BridgeHandle = {
  getState(): LifecycleState
  hasSession(): boolean
  dispose(): void
}

function originAllowed(origin: string, allowlist: readonly string[] | undefined): boolean {
  if (!allowlist || allowlist.length === 0) {
    return true
  }
  return allowlist.includes(origin)
}

function commandFromUnknown(raw: unknown): ProtocolEnvelope['type'] | undefined {
  if (raw && typeof raw === 'object' && 'type' in raw && typeof raw.type === 'string') {
    return raw.type as ProtocolEnvelope['type']
  }
  return undefined
}

function requestIdFromUnknown(raw: unknown): string | null {
  if (raw && typeof raw === 'object' && 'requestId' in raw && typeof raw.requestId === 'string') {
    return raw.requestId
  }
  return null
}

/** Host SDK may ping so the iframe can learn event.origin when referrer/ancestorOrigins are missing. */
function isOriginProbe(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false
  }
  const record = data as { channel?: unknown; type?: unknown }
  if (record.channel !== PROTOCOL_CHANNEL) {
    return false
  }
  return record.type === undefined || record.type === 'HOST_HELLO'
}

export function createModuleBridge(options: InitBridgeOptions = {}): BridgeHandle {
  const transport = options.transport ?? createWindowTransport()
  const logger = createSafeLogger(options.logger)
  const machine = new HandshakeMachine({
    instanceId: createId(),
    moduleVersion: options.moduleVersion ?? MODULE_VERSION,
  })

  let hostOrigin = transport.inferHostOrigin()
  const session = ensureSessionManager({
    instanceId: machine.instanceId,
    onAuthRequired(reason) {
      if (!hostOrigin) {
        return
      }
      transport.post(
        createEnvelope({
          instanceId: machine.instanceId,
          type: 'AUTH_REQUIRED',
          payload: { reason },
        }),
        hostOrigin,
      )
    },
  })
  let unsubscribe: (() => void) | null = null
  let disposed = false
  let readyPosted = false

  const entryUrl = transport.getEntryUrl()
  if (entryUrlContainsToken(entryUrl)) {
    logger.warn('ignored-token-in-url', { reason: 'credential-must-use-session-set' })
  }
  captureEntryRoute(entryUrl)
  bindApplicationToSession(session)

  const postModuleEvent = <T extends ProtocolEnvelope['type']>(
    type: T,
    payload: ProtocolEnvelope<T>['payload'],
  ) => {
    if (!hostOrigin) {
      return
    }
    transport.post(
      createEnvelope({
        instanceId: machine.instanceId,
        type,
        payload,
      }),
      hostOrigin,
    )
  }

  bindExternalNavigation((target) => {
    postModuleEvent('EXTERNAL_NAVIGATION_REQUESTED', { target })
  })
  bindConversationStateSink((payload) => {
    postModuleEvent('CONVERSATION_STATE_CHANGED', payload)
  })
  setUnreadCountSink((count) => {
    postModuleEvent('UNREAD_COUNT_CHANGED', { count })
  })
  setNotificationSink((payload) => {
    postModuleEvent('NOTIFICATION_REQUESTED', payload)
  })
  setResizeSink((size) => {
    if (!hostOrigin) {
      return
    }
    transport.post(
      {
        ...createEnvelope({
          instanceId: machine.instanceId,
          type: 'MODULE_OPENED',
          payload: { surface: session.getSide() === 'staff' ? 'ticket' : 'chat' },
        }),
        width: size.width,
        height: size.height,
      },
      hostOrigin,
    )
  })
  const unbindRouter = bindRouterBridge({
    emitRouteChanged(route) {
      postModuleEvent(
        'ROUTE_CHANGED',
        route.params === undefined ? { name: route.name } : { name: route.name, params: route.params },
      )
    },
  })

  const postAll = (output: HandshakeOutput) => {
    if (!hostOrigin) {
      return
    }
    for (const envelope of [...output.results, ...output.events]) {
      transport.post(envelope, hostOrigin)
    }
  }

  const postValidationFailure = (raw: unknown, failure: ValidationFailure) => {
    if (!hostOrigin) {
      return
    }
    const requestId = failure.correlationId ?? requestIdFromUnknown(raw)
    const command = commandFromUnknown(raw)
    const correlationId = requestId ?? createId()
    const code: FailureCode = failure.code
    const hostCommand = command && hostCommandSet.has(command) ? (command as HostCommandType) : undefined

    if (requestId && hostCommand) {
      transport.post(
        createEnvelope({
          instanceId: machine.instanceId,
          type: 'COMMAND_FAILED',
          requestId,
          payload: {
            code,
            category: FAILURE_CATEGORY_BY_CODE[code],
            retryable: isRetryable(code),
            correlationId,
            command: hostCommand,
          },
        }),
        hostOrigin,
      )
      return
    }

    transport.post(
      createEnvelope({
        instanceId: machine.instanceId,
        type: 'MODULE_ERROR',
        payload: {
          code,
          category: FAILURE_CATEGORY_BY_CODE[code],
          retryable: isRetryable(code),
          correlationId,
        },
      }),
      hostOrigin,
    )
  }

  const applySessionSideEffects = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') {
      return
    }
    const record = raw as {
      type?: unknown
      payload?: {
        generation?: unknown
        side?: unknown
        credential?: { scheme?: unknown; value?: unknown }
      }
    }
    if (record.type === 'HOST_INIT' && (record.payload?.side === 'user' || record.payload?.side === 'staff')) {
      session.setSide(record.payload.side)
      return
    }
    if (record.type === 'SESSION_SET' && typeof record.payload?.generation === 'number') {
      // Cookie is the V1 credential. Do not persist payload.credential.
      void session.setFromHost({ generation: record.payload.generation }).catch(() => {
        logger.warn('session-connect-failed', { generation: record.payload?.generation })
      })
      return
    }
    if (record.type === 'SESSION_CLEAR' && typeof record.payload?.generation === 'number') {
      session.clear(record.payload.generation)
      return
    }
    if (record.type === 'DISPOSE') {
      session.dispose()
    }
  }

  const ready = machine.announceReady()
  const postReady = (origin: string) => {
    if (readyPosted) {
      return
    }
    readyPosted = true
    transport.post(ready, origin)
  }
  if (transport.isEmbedded() && hostOrigin) {
    postReady(hostOrigin)
  }

  unsubscribe = transport.subscribe((data, meta) => {
    if (disposed) {
      return
    }

    if (meta.via === 'window') {
      if (!originAllowed(meta.origin, options.allowedOrigins)) {
        logger.warn('rejected-origin', { origin: meta.origin })
        return
      }
      if (data && typeof data === 'object' && 'channel' in data && data.channel !== PROTOCOL_CHANNEL) {
        return
      }
      if (!hostOrigin) {
        hostOrigin = meta.origin
        postReady(hostOrigin)
      } else if (meta.origin !== hostOrigin) {
        logger.warn('rejected-origin', { origin: meta.origin })
        return
      }
      if (meta.ports[0]) {
        transport.adoptPort?.(meta.ports[0])
      }
      if (isOriginProbe(data)) {
        return
      }
    } else if (!hostOrigin) {
      return
    }

    const { validation, output } = processHostMessage(machine, data)
    if (!validation.ok) {
      logger.warn('rejected-message', {
        code: validation.code,
        category: validation.category,
        type: commandFromUnknown(data),
      })
      postValidationFailure(data, validation)
      return
    }

    if (output) {
      let nextOutput = output
      if (output.results.some((result) => result.type === 'COMMAND_SUCCEEDED')) {
        applySessionSideEffects(validation.envelope)
        applyCommandToApplication(validation.envelope)
        if (validation.envelope.type === 'BACK_REQUESTED') {
          nextOutput = applyBackRequested(output)
        }
      }
      postAll(nextOutput)
      logger.debug('command', {
        type: validation.envelope.type,
        state: machine.getState(),
        requestId: validation.envelope.requestId,
      })
    }
  })

  return {
    getState: () => machine.getState(),
    hasSession: () => session.hasSession(),
    dispose: () => {
      if (disposed) {
        return
      }
      disposed = true
      unsubscribe?.()
      unsubscribe = null
      unbindRouter()
      setNotificationSink(null)
      setUnreadCountSink(null)
      setResizeSink(null)
      session.dispose()
      if (machine.getState() !== 'disposed') {
        const output = machine.handleHostCommand(
          createEnvelope({
            instanceId: machine.instanceId,
            type: 'DISPOSE',
            requestId: createId(),
            payload: { reason: 'unmounted' },
          }),
        )
        postAll(output)
      }
    },
  }
}
