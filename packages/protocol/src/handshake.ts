import { V1_CAPABILITIES } from './capabilities.js'
import { PROTOCOL_MAJOR, PROTOCOL_MAX_MINOR, PROTOCOL_MIN_MINOR, PROTOCOL_VERSION } from './constants.js'
import { createEnvelope } from './envelope.js'
import {
  FAILURE_CATEGORY_BY_CODE,
  type FailureCode,
  isRetryable,
} from './errors.js'
import type {
  COMMAND_FAILEDPayload,
  HostCommand,
  HostCommandType,
  HOST_INITPayload,
  ModuleEvent,
  NAVIGATEPayload,
  ProtocolEnvelope,
} from './generated/types.js'
import { createId } from './ids.js'

export const LIFECYCLE_STATES = [
  'created',
  'ready',
  'initialized',
  'foreground',
  'background',
  'recovering',
  'disposed',
] as const

export type LifecycleState = (typeof LIFECYCLE_STATES)[number]

export type PublicModuleConfig = {
  side: 'user' | 'staff'
  locale: string
  direction: 'ltr' | 'rtl'
  theme: 'light' | 'dark' | 'system'
  initialRouteName: HOST_INITPayload['initialRoute']['name']
  host: HOST_INITPayload['host']
}

export type HandshakeMachineOptions = {
  instanceId: string
  moduleVersion: string
  capabilities?: readonly string[]
}

export type HandshakeOutput = {
  results: Array<ProtocolEnvelope<'COMMAND_SUCCEEDED'> | ProtocolEnvelope<'COMMAND_FAILED'>>
  events: ModuleEvent[]
}

type ActiveState = Exclude<LifecycleState, 'created' | 'ready' | 'disposed'>

const COMMANDS_NEEDING_HOST_INIT = new Set<HostCommandType>([
  'SESSION_SET',
  'SESSION_CLEAR',
  'MODULE_OPEN',
  'MODULE_CLOSE',
  'NAVIGATE',
  'HOST_FOREGROUND',
  'HOST_BACKGROUND',
  'NETWORK_STATUS_CHANGED',
  'BACK_REQUESTED',
])

function allowedIn(state: LifecycleState, type: HostCommandType): boolean {
  if (type === 'DISPOSE') {
    return state !== 'disposed'
  }

  switch (state) {
    case 'created':
      return false
    case 'ready':
      return type === 'HOST_INIT' || type === 'SESSION_SET' || type === 'LOCALE_SET' || type === 'THEME_SET'
    case 'initialized':
      return type !== 'BACK_REQUESTED'
    case 'foreground':
      return true
    case 'background':
      return type !== 'BACK_REQUESTED'
    case 'recovering':
      return (
        type === 'SESSION_SET' ||
        type === 'SESSION_CLEAR' ||
        type === 'LOCALE_SET' ||
        type === 'THEME_SET' ||
        type === 'HOST_FOREGROUND' ||
        type === 'HOST_BACKGROUND' ||
        type === 'NETWORK_STATUS_CHANGED'
      )
    case 'disposed':
      return false
    default: {
      const _exhaustive: never = state
      return _exhaustive
    }
  }
}

export class HandshakeMachine {
  readonly instanceId: string
  readonly nonce: string
  readonly moduleVersion: string
  readonly capabilities: readonly string[]

  #state: LifecycleState = 'created'
  #hostInitAccepted = false
  #sessionGeneration: number | null = null
  #hasSession = false
  #opened = false
  #hostVisible = true
  #online = true
  #config: PublicModuleConfig | null = null
  #route: NAVIGATEPayload | null = null

  constructor(options: HandshakeMachineOptions) {
    this.instanceId = options.instanceId
    this.moduleVersion = options.moduleVersion
    this.capabilities = options.capabilities ?? V1_CAPABILITIES
    this.nonce = createId()
  }

  getState(): LifecycleState {
    return this.#state
  }

  getPublicConfig(): PublicModuleConfig | null {
    return this.#config
  }

  getSessionGeneration(): number | null {
    return this.#sessionGeneration
  }

  getRoute(): NAVIGATEPayload | null {
    return this.#route
  }

  hasSession(): boolean {
    return this.#hasSession
  }

  announceReady(): ProtocolEnvelope<'MODULE_READY'> {
    if (this.#state !== 'created') {
      throw new Error('MODULE_READY can only be announced from created')
    }
    this.#state = 'ready'
    return createEnvelope({
      instanceId: this.instanceId,
      type: 'MODULE_READY',
      payload: {
        moduleVersion: this.moduleVersion,
        protocol: {
          version: PROTOCOL_VERSION,
          major: PROTOCOL_MAJOR,
          minMinor: PROTOCOL_MIN_MINOR,
          maxMinor: PROTOCOL_MAX_MINOR,
        },
        nonce: this.nonce,
        capabilities: [...this.capabilities],
      },
    })
  }

  handleHostCommand(command: HostCommand): HandshakeOutput {
    const events: ModuleEvent[] = []
    const results: HandshakeOutput['results'] = []

    if (this.#state === 'disposed') {
      results.push(this.#failed(command, 'ALREADY_DISPOSED'))
      return { results, events }
    }

    if (!allowedIn(this.#state, command.type)) {
      results.push(this.#failed(command, 'LIFECYCLE_VIOLATION'))
      return { results, events }
    }

    if (COMMANDS_NEEDING_HOST_INIT.has(command.type) && !this.#hostInitAccepted) {
      results.push(this.#failed(command, 'LIFECYCLE_VIOLATION'))
      return { results, events }
    }

    switch (command.type) {
      case 'HOST_INIT':
        this.#handleHostInit(command, results)
        break
      case 'SESSION_SET':
        this.#handleSessionSet(command, results, events)
        break
      case 'SESSION_CLEAR':
        this.#handleSessionClear(command, results, events)
        break
      case 'MODULE_OPEN':
        this.#handleOpen(command, results, events)
        break
      case 'MODULE_CLOSE':
        this.#handleClose(command, results, events)
        break
      case 'NAVIGATE':
        this.#handleNavigate(command, results, events)
        break
      case 'LOCALE_SET':
        this.#handleLocale(command, results)
        break
      case 'THEME_SET':
        this.#handleTheme(command, results)
        break
      case 'HOST_FOREGROUND':
        this.#hostVisible = true
        this.#reconcileState()
        results.push(this.#succeeded(command))
        break
      case 'HOST_BACKGROUND':
        this.#hostVisible = false
        this.#reconcileState()
        results.push(this.#succeeded(command))
        break
      case 'NETWORK_STATUS_CHANGED':
        this.#handleNetwork(command, results)
        break
      case 'BACK_REQUESTED':
        results.push(
          createEnvelope({
            instanceId: this.instanceId,
            type: 'COMMAND_SUCCEEDED',
            requestId: command.requestId,
            payload: { command: 'BACK_REQUESTED', handled: false },
          }),
        )
        break
      case 'DISPOSE':
        this.#handleDispose(command, results, events)
        break
      default: {
        const _exhaustive: never = command
        results.push(this.#failed(_exhaustive, 'UNKNOWN_TYPE'))
      }
    }

    return { results, events }
  }

  #handleHostInit(
    command: ProtocolEnvelope<'HOST_INIT'>,
    results: HandshakeOutput['results'],
  ): void {
    if (command.payload.nonce !== this.nonce) {
      results.push(this.#failed(command, 'INVALID_NONCE'))
      return
    }

    this.#hostInitAccepted = true
    this.#config = {
      side: command.payload.side,
      locale: command.payload.locale,
      direction: command.payload.direction,
      theme: command.payload.theme,
      initialRouteName: command.payload.initialRoute.name,
      host: command.payload.host,
    }
    this.#route = { name: command.payload.initialRoute.name }
    results.push(this.#succeeded(command))
  }

  #handleSessionSet(
    command: ProtocolEnvelope<'SESSION_SET'>,
    results: HandshakeOutput['results'],
    events: ModuleEvent[],
  ): void {
    const generation = command.payload.generation
    if (this.#sessionGeneration !== null && generation <= this.#sessionGeneration) {
      results.push(this.#failed(command, 'STALE_GENERATION'))
      return
    }

    const first = !this.#hasSession
    this.#sessionGeneration = generation
    this.#hasSession = true
    this.#reconcileState()

    if (first && this.#config) {
      events.push(
        createEnvelope({
          instanceId: this.instanceId,
          type: 'MODULE_INITIALIZED',
          payload: {
            side: this.#config.side,
            sessionGeneration: generation,
          },
        }),
      )
    }

    results.push(this.#succeeded(command))
  }

  #handleSessionClear(
    command: ProtocolEnvelope<'SESSION_CLEAR'>,
    results: HandshakeOutput['results'],
    events: ModuleEvent[],
  ): void {
    if (this.#sessionGeneration !== null && command.payload.generation <= this.#sessionGeneration) {
      results.push(this.#failed(command, 'STALE_GENERATION'))
      return
    }

    this.#sessionGeneration = command.payload.generation
    this.#hasSession = false
    this.#opened = false
    this.#state = 'ready'
    events.push(
      createEnvelope({
        instanceId: this.instanceId,
        type: 'MODULE_CLOSED',
        payload: { reason: 'session-cleared' },
      }),
    )
    results.push(this.#succeeded(command))
  }

  #handleOpen(
    command: ProtocolEnvelope<'MODULE_OPEN'>,
    results: HandshakeOutput['results'],
    events: ModuleEvent[],
  ): void {
    this.#opened = true
    this.#reconcileState()
    events.push(
      createEnvelope({
        instanceId: this.instanceId,
        type: 'MODULE_OPENED',
        payload: command.payload.surface === undefined ? {} : { surface: command.payload.surface },
      }),
    )
    results.push(this.#succeeded(command))
  }

  #handleClose(
    command: ProtocolEnvelope<'MODULE_CLOSE'>,
    results: HandshakeOutput['results'],
    events: ModuleEvent[],
  ): void {
    const wasOpen = this.#opened
    this.#opened = false
    this.#reconcileState()
    if (wasOpen) {
      events.push(
        createEnvelope({
          instanceId: this.instanceId,
          type: 'MODULE_CLOSED',
          payload: { reason: command.payload.reason ?? 'host-requested' },
        }),
      )
    }
    results.push(this.#succeeded(command))
  }

  #handleNavigate(
    command: ProtocolEnvelope<'NAVIGATE'>,
    results: HandshakeOutput['results'],
    events: ModuleEvent[],
  ): void {
    this.#route = command.payload
    events.push(
      createEnvelope({
        instanceId: this.instanceId,
        type: 'ROUTE_CHANGED',
        payload:
          command.payload.params === undefined
            ? { name: command.payload.name }
            : { name: command.payload.name, params: command.payload.params },
      }),
    )
    results.push(this.#succeeded(command))
  }

  #handleLocale(
    command: ProtocolEnvelope<'LOCALE_SET'>,
    results: HandshakeOutput['results'],
  ): void {
    if (this.#config) {
      this.#config = {
        ...this.#config,
        locale: command.payload.locale,
        ...(command.payload.direction === undefined ? {} : { direction: command.payload.direction }),
      }
    }
    results.push(this.#succeeded(command))
  }

  #handleTheme(
    command: ProtocolEnvelope<'THEME_SET'>,
    results: HandshakeOutput['results'],
  ): void {
    if (this.#config) {
      this.#config = { ...this.#config, theme: command.payload.theme }
    }
    results.push(this.#succeeded(command))
  }

  #handleNetwork(
    command: ProtocolEnvelope<'NETWORK_STATUS_CHANGED'>,
    results: HandshakeOutput['results'],
  ): void {
    this.#online = command.payload.online
    this.#reconcileState()
    results.push(this.#succeeded(command))
  }

  #handleDispose(
    command: ProtocolEnvelope<'DISPOSE'>,
    results: HandshakeOutput['results'],
    events: ModuleEvent[],
  ): void {
    if (this.#opened) {
      events.push(
        createEnvelope({
          instanceId: this.instanceId,
          type: 'MODULE_CLOSED',
          payload: { reason: 'disposed' },
        }),
      )
    }
    this.#opened = false
    this.#hasSession = false
    this.#sessionGeneration = null
    this.#state = 'disposed'
    events.push(
      createEnvelope({
        instanceId: this.instanceId,
        type: 'MODULE_DISPOSED',
        payload: command.payload.reason === undefined ? {} : { reason: command.payload.reason },
      }),
    )
    results.push(this.#succeeded(command))
  }

  #reconcileState(): void {
    if (this.#state === 'disposed' || this.#state === 'created') {
      return
    }
    if (!this.#hasSession) {
      this.#state = 'ready'
      return
    }
    if (!this.#online) {
      this.#state = 'recovering'
      return
    }
    this.#state = this.#deriveActiveState()
  }

  #deriveActiveState(): ActiveState {
    if (this.#opened && this.#hostVisible) {
      return 'foreground'
    }
    if (this.#opened && !this.#hostVisible) {
      return 'background'
    }
    return 'initialized'
  }

  #succeeded(
    command: HostCommand,
    extra?: { handled?: boolean },
  ): ProtocolEnvelope<'COMMAND_SUCCEEDED'> {
    return createEnvelope({
      instanceId: this.instanceId,
      type: 'COMMAND_SUCCEEDED',
      requestId: command.requestId,
      payload:
        extra?.handled === undefined
          ? { command: command.type }
          : { command: command.type, handled: extra.handled },
    })
  }

  #failed(
    command: HostCommand,
    code: FailureCode,
  ): ProtocolEnvelope<'COMMAND_FAILED'> {
    const payload: COMMAND_FAILEDPayload = {
      code,
      category: FAILURE_CATEGORY_BY_CODE[code],
      retryable: isRetryable(code),
      correlationId: command.requestId ?? command.messageId,
      command: command.type,
    }
    return createEnvelope({
      instanceId: this.instanceId,
      type: 'COMMAND_FAILED',
      requestId: command.requestId,
      payload,
    })
  }
}
