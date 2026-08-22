import { PROTOCOL_CHANNEL, PROTOCOL_VERSION } from './constants.js'
import type { MessageType, PayloadByType, ProtocolEnvelope } from './generated/types.js'
import { createId, nowIso } from './ids.js'

export function createEnvelope<T extends MessageType>(input: {
  instanceId: string
  type: T
  payload: PayloadByType[T]
  requestId?: string | null
  messageId?: string
  sentAt?: string
  protocolVersion?: string
}): ProtocolEnvelope<T> {
  return {
    channel: PROTOCOL_CHANNEL,
    protocolVersion: input.protocolVersion ?? PROTOCOL_VERSION,
    instanceId: input.instanceId,
    messageId: input.messageId ?? createId(),
    requestId: input.requestId ?? null,
    type: input.type,
    sentAt: input.sentAt ?? nowIso(),
    payload: input.payload,
  }
}
