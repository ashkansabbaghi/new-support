import {
  HOST_COMMAND_TYPES,
  PROTOCOL_MAJOR,
  PROTOCOL_MAX_MINOR,
  validateMessage,
  type MODULE_READYPayload,
  type ProtocolMessage,
} from '@nipoto/support-protocol'

import { originsMatch } from './origin.js'

const hostCommandSet = new Set<string>(HOST_COMMAND_TYPES)

export type IncomingInspection =
  | { ok: true; envelope: ProtocolMessage }
  | { ok: false; code: string; reason: string }

export type InspectIncomingInput = {
  data: unknown
  origin: string
  source: unknown
  expectedOrigin: string
  expectedSource: unknown
  expectedNonce?: string
  expectedInstanceId?: string
  /** Dedicated MessageChannel — origin/source already bound at handshake. */
  viaPort?: boolean
}

/**
 * Loader / Web SDK stay compatible with the current and previous protocol
 * minor of the same major (DELIVERY §5.1). Breaking changes require a new major.
 */
export function isCompatibleProtocol(
  protocol: {
    major: number
    minMinor: number
    maxMinor: number
  },
  supportedMaxMinor: number = PROTOCOL_MAX_MINOR,
): boolean {
  if (protocol.major !== PROTOCOL_MAJOR) {
    return false
  }
  const supportedMin = Math.max(0, supportedMaxMinor - 1)
  return protocol.minMinor <= supportedMaxMinor && protocol.maxMinor >= supportedMin
}

export function inspectIncoming(input: InspectIncomingInput): IncomingInspection {
  if (!input.viaPort) {
    if (!originsMatch(input.origin, input.expectedOrigin)) {
      return { ok: false, code: 'ORIGIN_MISMATCH', reason: 'event.origin does not match module origin' }
    }
    if (input.source !== input.expectedSource) {
      return { ok: false, code: 'SOURCE_MISMATCH', reason: 'event.source does not match iframe window' }
    }
  }

  const validated = validateMessage(input.data)
  if (!validated.ok) {
    return { ok: false, code: validated.code, reason: 'schema' }
  }

  if (hostCommandSet.has(validated.envelope.type)) {
    return { ok: false, code: 'UNEXPECTED_TYPE', reason: 'host command must not arrive from the module' }
  }

  if (input.expectedInstanceId && validated.envelope.instanceId !== input.expectedInstanceId) {
    return { ok: false, code: 'INSTANCE_MISMATCH', reason: 'instanceId mismatch' }
  }

  const message = validated.envelope as ProtocolMessage

  if (message.type === 'MODULE_READY') {
    const protocolCheck = inspectReadyProtocol(message.payload)
    if (!protocolCheck.ok) {
      return protocolCheck
    }
    if (input.expectedNonce && message.payload.nonce !== input.expectedNonce) {
      return { ok: false, code: 'INVALID_NONCE', reason: 'nonce mismatch' }
    }
  }

  return { ok: true, envelope: message }
}

export function inspectReadyProtocol(payload: MODULE_READYPayload): IncomingInspection | { ok: true } {
  if (!payload.nonce || payload.nonce.length < 16) {
    return { ok: false, code: 'INVALID_NONCE', reason: 'MODULE_READY nonce is missing' }
  }
  if (!isCompatibleProtocol(payload.protocol)) {
    return { ok: false, code: 'UNSUPPORTED_PROTOCOL', reason: 'protocol range is not compatible' }
  }
  return { ok: true }
}
