/**
 * GENERATED FILE — do not edit by hand.
 * Source of truth: JSON Schema Draft 2020-12 in schemas/1.0.
 * Regenerate with: yarn workspace @nipoto/support-protocol generate
 */

export const HOST_COMMAND_TYPES = ["HOST_INIT","SESSION_SET","SESSION_CLEAR","MODULE_OPEN","MODULE_CLOSE","NAVIGATE","LOCALE_SET","THEME_SET","HOST_FOREGROUND","HOST_BACKGROUND","NETWORK_STATUS_CHANGED","BACK_REQUESTED","DISPOSE"] as const
export const MODULE_EVENT_TYPES = ["MODULE_READY","MODULE_INITIALIZED","MODULE_OPENED","MODULE_CLOSED","ROUTE_CHANGED","UNREAD_COUNT_CHANGED","CONVERSATION_STATE_CHANGED","EXTERNAL_NAVIGATION_REQUESTED","NOTIFICATION_REQUESTED","AUTH_REQUIRED","MODULE_ERROR","MODULE_DISPOSED"] as const
export const RESULT_TYPES = ["COMMAND_SUCCEEDED","COMMAND_FAILED"] as const

export type HostCommandType = (typeof HOST_COMMAND_TYPES)[number]
export type ModuleEventType = (typeof MODULE_EVENT_TYPES)[number]
export type ResultType = (typeof RESULT_TYPES)[number]
export type MessageType = HostCommandType | ModuleEventType | ResultType

export type HOST_INITPayload = {
  readonly nonce: string
  readonly side: "user" | "staff"
  readonly locale: string
  readonly direction: "ltr" | "rtl"
  readonly theme: "light" | "dark" | "system"
  readonly initialRoute: {
    readonly name: "conversation.home" | "conversation.new" | "conversation.view" | "conversation.queue" | "conversation.history" | "ticket.list" | "ticket.view"
  }
  readonly host: {
    readonly appId: string
    readonly appVersion: string
    readonly branding: {
      readonly brandId: string
      readonly displayName?: string
    }
    readonly platform: string
  }
  readonly requiredCapabilities?: readonly string[]
}

export type SESSION_SETPayload = {
  readonly generation: number
  readonly credential: {
    readonly scheme: "bearer"
    readonly value: string
  }
}

export type SESSION_CLEARPayload = {
  readonly generation: number
  readonly reason?: "logout" | "account-switch" | "expired" | "host-requested"
}

export type MODULE_OPENPayload = {
  readonly surface?: "chat" | "ticket"
}

export type MODULE_CLOSEPayload = {
  readonly reason?: "host-requested" | "user"
}

export type NAVIGATEPayload = {
  readonly name: "conversation.home" | "conversation.new" | "conversation.view" | "conversation.queue" | "conversation.history" | "ticket.list" | "ticket.view"
  readonly params?: {
    readonly conversationId?: string
  }
  readonly replace?: boolean
}

export type LOCALE_SETPayload = {
  readonly locale: string
  readonly direction?: "ltr" | "rtl"
}

export type THEME_SETPayload = {
  readonly theme: "light" | "dark" | "system"
}

export type HOST_FOREGROUNDPayload = Record<string, never>

export type HOST_BACKGROUNDPayload = Record<string, never>

export type NETWORK_STATUS_CHANGEDPayload = {
  readonly online: boolean
}

export type BACK_REQUESTEDPayload = Record<string, never>

export type DISPOSEPayload = {
  readonly reason?: "host-requested" | "unmounted"
}

export type MODULE_READYPayload = {
  readonly moduleVersion: string
  readonly protocol: {
    readonly version: "1.0"
    readonly major: 1
    readonly minMinor: number
    readonly maxMinor: number
  }
  readonly nonce: string
  readonly capabilities: readonly string[]
}

export type MODULE_INITIALIZEDPayload = {
  readonly side: "user" | "staff"
  readonly sessionGeneration: number
}

export type MODULE_OPENEDPayload = {
  readonly surface?: "chat" | "ticket"
}

export type MODULE_CLOSEDPayload = {
  readonly reason: "host-requested" | "session-cleared" | "disposed" | "user"
}

export type ROUTE_CHANGEDPayload = {
  readonly name: "conversation.home" | "conversation.new" | "conversation.view" | "conversation.queue" | "conversation.history" | "ticket.list" | "ticket.view"
  readonly params?: {
    readonly conversationId?: string
  }
}

export type UNREAD_COUNT_CHANGEDPayload = {
  readonly count: number
}

export type CONVERSATION_STATE_CHANGEDPayload = {
  readonly conversationId: string
  readonly state: "queued" | "processing" | "opened" | "reopened" | "staff-replied" | "user-replied" | "conveyed" | "requeued" | "closed"
}

export type EXTERNAL_NAVIGATION_REQUESTEDPayload = {
  readonly target: "help" | "login" | "account" | "upgrade"
}

export type NOTIFICATION_REQUESTEDPayload = {
  readonly kind: "new-message" | "conversation-state" | "queue"
  readonly conversationId?: string
}

export type AUTH_REQUIREDPayload = {
  readonly reason: "unauthorized" | "expired" | "missing" | "revoked"
}

export type MODULE_ERRORPayload = {
  readonly code: "INVALID_ENVELOPE" | "ENVELOPE_TOO_LARGE" | "UNSUPPORTED_PROTOCOL" | "UNKNOWN_TYPE" | "UNSUPPORTED_CAPABILITY" | "LIFECYCLE_VIOLATION" | "INVALID_NONCE" | "STALE_GENERATION" | "FORBIDDEN_PAYLOAD" | "ALREADY_DISPOSED" | "INTERNAL"
  readonly category: "validation" | "lifecycle" | "capability" | "auth" | "security" | "protocol" | "internal"
  readonly retryable: boolean
  readonly correlationId: string
}

export type MODULE_DISPOSEDPayload = {
  readonly reason?: "host-requested" | "unmounted"
}

export type COMMAND_SUCCEEDEDPayload = {
  readonly command: "HOST_INIT" | "SESSION_SET" | "SESSION_CLEAR" | "MODULE_OPEN" | "MODULE_CLOSE" | "NAVIGATE" | "LOCALE_SET" | "THEME_SET" | "HOST_FOREGROUND" | "HOST_BACKGROUND" | "NETWORK_STATUS_CHANGED" | "BACK_REQUESTED" | "DISPOSE"
  readonly handled?: boolean
}

export type COMMAND_FAILEDPayload = {
  readonly code: "INVALID_ENVELOPE" | "ENVELOPE_TOO_LARGE" | "UNSUPPORTED_PROTOCOL" | "UNKNOWN_TYPE" | "UNSUPPORTED_CAPABILITY" | "LIFECYCLE_VIOLATION" | "INVALID_NONCE" | "STALE_GENERATION" | "FORBIDDEN_PAYLOAD" | "ALREADY_DISPOSED" | "INTERNAL"
  readonly category: "validation" | "lifecycle" | "capability" | "auth" | "security" | "protocol" | "internal"
  readonly retryable: boolean
  readonly correlationId: string
  readonly command?: "HOST_INIT" | "SESSION_SET" | "SESSION_CLEAR" | "MODULE_OPEN" | "MODULE_CLOSE" | "NAVIGATE" | "LOCALE_SET" | "THEME_SET" | "HOST_FOREGROUND" | "HOST_BACKGROUND" | "NETWORK_STATUS_CHANGED" | "BACK_REQUESTED" | "DISPOSE"
}

export interface PayloadByType {
  HOST_INIT: HOST_INITPayload
  SESSION_SET: SESSION_SETPayload
  SESSION_CLEAR: SESSION_CLEARPayload
  MODULE_OPEN: MODULE_OPENPayload
  MODULE_CLOSE: MODULE_CLOSEPayload
  NAVIGATE: NAVIGATEPayload
  LOCALE_SET: LOCALE_SETPayload
  THEME_SET: THEME_SETPayload
  HOST_FOREGROUND: HOST_FOREGROUNDPayload
  HOST_BACKGROUND: HOST_BACKGROUNDPayload
  NETWORK_STATUS_CHANGED: NETWORK_STATUS_CHANGEDPayload
  BACK_REQUESTED: BACK_REQUESTEDPayload
  DISPOSE: DISPOSEPayload
  MODULE_READY: MODULE_READYPayload
  MODULE_INITIALIZED: MODULE_INITIALIZEDPayload
  MODULE_OPENED: MODULE_OPENEDPayload
  MODULE_CLOSED: MODULE_CLOSEDPayload
  ROUTE_CHANGED: ROUTE_CHANGEDPayload
  UNREAD_COUNT_CHANGED: UNREAD_COUNT_CHANGEDPayload
  CONVERSATION_STATE_CHANGED: CONVERSATION_STATE_CHANGEDPayload
  EXTERNAL_NAVIGATION_REQUESTED: EXTERNAL_NAVIGATION_REQUESTEDPayload
  NOTIFICATION_REQUESTED: NOTIFICATION_REQUESTEDPayload
  AUTH_REQUIRED: AUTH_REQUIREDPayload
  MODULE_ERROR: MODULE_ERRORPayload
  MODULE_DISPOSED: MODULE_DISPOSEDPayload
  COMMAND_SUCCEEDED: COMMAND_SUCCEEDEDPayload
  COMMAND_FAILED: COMMAND_FAILEDPayload
}

export interface ProtocolEnvelope<T extends MessageType = MessageType> {
  readonly channel: 'nipoto.support'
  readonly protocolVersion: string
  readonly instanceId: string
  readonly messageId: string
  readonly requestId: string | null
  readonly type: T
  readonly sentAt: string
  readonly payload: PayloadByType[T]
}

export type HostCommand =
  | ProtocolEnvelope<'HOST_INIT'>
  | ProtocolEnvelope<'SESSION_SET'>
  | ProtocolEnvelope<'SESSION_CLEAR'>
  | ProtocolEnvelope<'MODULE_OPEN'>
  | ProtocolEnvelope<'MODULE_CLOSE'>
  | ProtocolEnvelope<'NAVIGATE'>
  | ProtocolEnvelope<'LOCALE_SET'>
  | ProtocolEnvelope<'THEME_SET'>
  | ProtocolEnvelope<'HOST_FOREGROUND'>
  | ProtocolEnvelope<'HOST_BACKGROUND'>
  | ProtocolEnvelope<'NETWORK_STATUS_CHANGED'>
  | ProtocolEnvelope<'BACK_REQUESTED'>
  | ProtocolEnvelope<'DISPOSE'>

export type ModuleEvent =
  | ProtocolEnvelope<'MODULE_READY'>
  | ProtocolEnvelope<'MODULE_INITIALIZED'>
  | ProtocolEnvelope<'MODULE_OPENED'>
  | ProtocolEnvelope<'MODULE_CLOSED'>
  | ProtocolEnvelope<'ROUTE_CHANGED'>
  | ProtocolEnvelope<'UNREAD_COUNT_CHANGED'>
  | ProtocolEnvelope<'CONVERSATION_STATE_CHANGED'>
  | ProtocolEnvelope<'EXTERNAL_NAVIGATION_REQUESTED'>
  | ProtocolEnvelope<'NOTIFICATION_REQUESTED'>
  | ProtocolEnvelope<'AUTH_REQUIRED'>
  | ProtocolEnvelope<'MODULE_ERROR'>
  | ProtocolEnvelope<'MODULE_DISPOSED'>

export type CommandResult =
  | ProtocolEnvelope<'COMMAND_SUCCEEDED'>
  | ProtocolEnvelope<'COMMAND_FAILED'>

export type ProtocolMessage = HostCommand | ModuleEvent | CommandResult

