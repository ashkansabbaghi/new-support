import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

import { findUnknownCapabilities } from './capabilities.js'
import {
  FORBIDDEN_BRIDGE_KEYS,
  FORBIDDEN_HOST_COMMANDS,
  MAX_ENVELOPE_BYTES,
  PROTOCOL_CHANNEL,
  PROTOCOL_MAJOR,
  TOKEN_PARAM_KEYS,
} from './constants.js'
import {
  FAILURE_CATEGORY_BY_CODE,
  type FailureCategory,
  type FailureCode,
  isRetryable,
} from './errors.js'
import type { HostCommand, MessageType, ProtocolEnvelope } from './generated/types.js'
import { HOST_COMMAND_TYPES, MODULE_EVENT_TYPES, RESULT_TYPES } from './generated/types.js'
import { envelopeSchema, payloadSchemaMap } from './schemas.js'

const forbiddenKeys = new Set<string>(FORBIDDEN_BRIDGE_KEYS)
const tokenKeys = new Set<string>(TOKEN_PARAM_KEYS.map((key) => key.toLowerCase()))
const forbiddenCommands = new Set<string>(FORBIDDEN_HOST_COMMANDS)
const hostCommandSet = new Set<string>(HOST_COMMAND_TYPES)
const knownTypes = new Set<string>([...HOST_COMMAND_TYPES, ...MODULE_EVENT_TYPES, ...RESULT_TYPES])

const URLISH = /^(https?:|javascript:|data:)/i
const HTMLISH = /<[a-zA-Z!/?]/

export type ValidationSuccess<T extends ProtocolEnvelope = ProtocolEnvelope> = {
  ok: true
  envelope: T
}

export type ValidationFailure = {
  ok: false
  code: FailureCode
  category: FailureCategory
  retryable: boolean
  correlationId: string | null
}

export type ValidationResult<T extends ProtocolEnvelope = ProtocolEnvelope> =
  | ValidationSuccess<T>
  | ValidationFailure

const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  validateFormats: true,
  code: { esm: true },
})
addFormats(ajv)

const validateEnvelope = ajv.compile(envelopeSchema)
const payloadValidators = new Map<string, ValidateFunction>()

for (const [type, schema] of Object.entries(payloadSchemaMap())) {
  payloadValidators.set(type, ajv.compile(schema))
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length
}

function measure(raw: unknown): { bytes: number; parsed: unknown } | ValidationFailure {
  if (typeof raw === 'string') {
    const bytes = utf8Bytes(raw)
    if (bytes > MAX_ENVELOPE_BYTES) {
      return fail('ENVELOPE_TOO_LARGE', null)
    }
    try {
      return { bytes, parsed: JSON.parse(raw) as unknown }
    } catch {
      return fail('INVALID_ENVELOPE', null)
    }
  }

  try {
    const bytes = utf8Bytes(JSON.stringify(raw))
    if (bytes > MAX_ENVELOPE_BYTES) {
      return fail('ENVELOPE_TOO_LARGE', correlationFrom(raw))
    }
    return { bytes, parsed: raw }
  } catch {
    return fail('INVALID_ENVELOPE', null)
  }
}

function correlationFrom(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const record = raw as Record<string, unknown>
  if (typeof record.requestId === 'string') {
    return record.requestId
  }
  if (typeof record.messageId === 'string') {
    return record.messageId
  }
  return null
}

function fail(code: FailureCode, correlationId: string | null): ValidationFailure {
  return {
    ok: false,
    code,
    category: FAILURE_CATEGORY_BY_CODE[code],
    retryable: isRetryable(code),
    correlationId,
  }
}

function looksLikeEnvelope(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function walkForbidden(
  value: unknown,
  path: string[],
  options: { allowCredentialValue: boolean },
): FailureCode | null {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const code = walkForbidden(item, [...path, String(index)], options)
      if (code) {
        return code
      }
    }
    return null
  }

  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && path[path.length - 1] !== 'value') {
      if (URLISH.test(value) || HTMLISH.test(value)) {
        return 'FORBIDDEN_PAYLOAD'
      }
    }
    return null
  }

  for (const [key, nested] of Object.entries(value)) {
    const lower = key.toLowerCase()
    const sessionCredentialRoot =
      options.allowCredentialValue && path.length === 0 && lower === 'credential'
    if (forbiddenKeys.has(key) || (tokenKeys.has(lower) && !sessionCredentialRoot)) {
      return 'FORBIDDEN_PAYLOAD'
    }
    if (options.allowCredentialValue && path[0] === 'credential' && key === 'value') {
      continue
    }
    const code = walkForbidden(nested, [...path, key], options)
    if (code) {
      return code
    }
  }

  return null
}

function parseProtocolMajor(version: unknown): number | null {
  if (typeof version !== 'string') {
    return null
  }
  const match = /^([0-9]+)\.([0-9]+)$/.exec(version)
  if (!match) {
    return null
  }
  return Number(match[1])
}

export function validateMessage(raw: unknown): ValidationResult {
  const sized = measure(raw)
  if ('ok' in sized) {
    return sized
  }

  const { parsed } = sized
  const correlation = correlationFrom(parsed)

  if (!looksLikeEnvelope(parsed)) {
    return fail('INVALID_ENVELOPE', correlation)
  }

  if (typeof parsed.type === 'string' && forbiddenCommands.has(parsed.type)) {
    return fail('UNKNOWN_TYPE', correlation)
  }

  if (typeof parsed.type === 'string' && !knownTypes.has(parsed.type)) {
    return fail('UNKNOWN_TYPE', correlation)
  }

  const major = parseProtocolMajor(parsed.protocolVersion)
  if (parsed.protocolVersion !== undefined && major !== PROTOCOL_MAJOR) {
    return fail('UNSUPPORTED_PROTOCOL', correlation)
  }

  if (parsed.channel !== undefined && parsed.channel !== PROTOCOL_CHANNEL) {
    return fail('INVALID_ENVELOPE', correlation)
  }

  const envelopeOk = validateEnvelope(parsed)
  if (!envelopeOk) {
    return fail('INVALID_ENVELOPE', correlation)
  }

  const type = parsed.type as MessageType
  const payload = parsed.payload
  const validator = payloadValidators.get(type)
  if (!validator) {
    return fail('UNKNOWN_TYPE', correlation)
  }

  const payloadOk = validator(payload)
  if (!payloadOk) {
    return fail('INVALID_ENVELOPE', correlation)
  }

  const forbidden = walkForbidden(payload, [], {
    allowCredentialValue: type === 'SESSION_SET',
  })
  if (forbidden) {
    return fail(forbidden, correlation)
  }

  if (type === 'HOST_INIT') {
    const required = (payload as { requiredCapabilities?: string[] }).requiredCapabilities
    if (required && findUnknownCapabilities(required).length > 0) {
      return fail('UNSUPPORTED_CAPABILITY', correlation)
    }
  }

  if (hostCommandSet.has(type) && parsed.requestId === null) {
    return fail('INVALID_ENVELOPE', correlation)
  }

  return { ok: true, envelope: parsed as unknown as ProtocolEnvelope }
}

export function validateHostCommand(raw: unknown): ValidationResult<HostCommand> {
  const result = validateMessage(raw)
  if (!result.ok) {
    return result
  }
  if (!hostCommandSet.has(result.envelope.type)) {
    return fail('UNKNOWN_TYPE', result.envelope.requestId ?? result.envelope.messageId)
  }
  return result as ValidationResult<HostCommand>
}
