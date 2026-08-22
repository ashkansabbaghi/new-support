import type { PayloadByType } from '@nipoto/support-protocol'

import { COOKIE_CREDENTIAL_PLACEHOLDER } from './constants.js'
import type { SetSessionInput } from './types.js'

/**
 * SESSION_SET is a generation bump. The cookie is the credential.
 * Host-supplied token / credential / authorization fields are dropped.
 */
export function buildSessionSetPayload(generation: number, _ignored?: unknown): PayloadByType['SESSION_SET'] {
  void _ignored
  return {
    generation,
    credential: {
      scheme: 'bearer',
      value: COOKIE_CREDENTIAL_PLACEHOLDER,
    },
  }
}

export function nextSessionGeneration(current: number, input?: SetSessionInput): number {
  if (
    typeof input?.generation === 'number' &&
    Number.isInteger(input.generation) &&
    input.generation > current
  ) {
    return input.generation
  }
  return current + 1
}
