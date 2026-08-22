import type { HostCommand } from './generated/types.js'
import type { HandshakeMachine, HandshakeOutput } from './handshake.js'
import { type ValidationResult, validateHostCommand } from './validate.js'

export type ProcessHostMessageResult = {
  validation: ValidationResult<HostCommand>
  output: HandshakeOutput | null
}

export function processHostMessage(
  machine: HandshakeMachine,
  raw: unknown,
): ProcessHostMessageResult {
  const validation = validateHostCommand(raw)
  if (!validation.ok) {
    return { validation, output: null }
  }

  if (validation.envelope.instanceId !== machine.instanceId) {
    return {
      validation: {
        ok: false,
        code: 'INVALID_ENVELOPE',
        category: 'validation',
        retryable: false,
        correlationId: validation.envelope.requestId ?? validation.envelope.messageId,
      },
      output: null,
    }
  }

  return {
    validation,
    output: machine.handleHostCommand(validation.envelope),
  }
}
