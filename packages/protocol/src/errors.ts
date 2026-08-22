export const FAILURE_CODES = [
  'INVALID_ENVELOPE',
  'ENVELOPE_TOO_LARGE',
  'UNSUPPORTED_PROTOCOL',
  'UNKNOWN_TYPE',
  'UNSUPPORTED_CAPABILITY',
  'LIFECYCLE_VIOLATION',
  'INVALID_NONCE',
  'STALE_GENERATION',
  'FORBIDDEN_PAYLOAD',
  'ALREADY_DISPOSED',
  'INTERNAL',
] as const

export type FailureCode = (typeof FAILURE_CODES)[number]

export const FAILURE_CATEGORIES = [
  'validation',
  'lifecycle',
  'capability',
  'auth',
  'security',
  'protocol',
  'internal',
] as const

export type FailureCategory = (typeof FAILURE_CATEGORIES)[number]

export const FAILURE_CATEGORY_BY_CODE: Record<FailureCode, FailureCategory> = {
  INVALID_ENVELOPE: 'validation',
  ENVELOPE_TOO_LARGE: 'validation',
  UNSUPPORTED_PROTOCOL: 'protocol',
  UNKNOWN_TYPE: 'protocol',
  UNSUPPORTED_CAPABILITY: 'capability',
  LIFECYCLE_VIOLATION: 'lifecycle',
  INVALID_NONCE: 'security',
  STALE_GENERATION: 'lifecycle',
  FORBIDDEN_PAYLOAD: 'security',
  ALREADY_DISPOSED: 'lifecycle',
  INTERNAL: 'internal',
}

export const RETRYABLE_CODES = new Set<FailureCode>(['INTERNAL'])

export function isRetryable(code: FailureCode): boolean {
  return RETRYABLE_CODES.has(code)
}
