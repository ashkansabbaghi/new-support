/**
 * Emits src/generated/types.ts from JSON Schema Draft 2020-12 files.
 * Schemas remain the source of truth (ADR-005).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schemaDir = join(root, 'schemas', '1.0')
const outFile = join(root, 'src', 'generated', 'types.ts')

/**
 * @param {unknown} schema
 * @param {string} indent
 * @returns {string}
 */
function tsType(schema, indent = '  ') {
  if (!schema || typeof schema !== 'object') return 'unknown'
  const s = /** @type {Record<string, unknown>} */ (schema)

  if (Object.prototype.hasOwnProperty.call(s, 'const')) {
    return literal(s.const)
  }

  if (Array.isArray(s.enum)) {
    return s.enum.map(literal).join(' | ')
  }

  const types = Array.isArray(s.type) ? s.type : s.type ? [s.type] : []

  if (types.includes('object') || s.properties) {
    const properties = /** @type {Record<string, unknown>} */ (s.properties ?? {})
    const required = new Set(/** @type {string[]} */ (s.required ?? []))
    const keys = Object.keys(properties)
    if (keys.length === 0) {
      return 'Record<string, never>'
    }
    const inner = keys
      .map((key) => {
        const optional = required.has(key) ? '' : '?'
        const child = tsType(properties[key], `${indent}  `)
        return `${indent}  readonly ${ident(key)}${optional}: ${child}`
      })
      .join('\n')
    return `{\n${inner}\n${indent}}`
  }

  if (types.includes('array')) {
    const items = tsType(s.items ?? {}, indent)
    return `readonly ${paren(items)}[]`
  }

  const parts = types.map((t) => {
    if (t === 'string') return 'string'
    if (t === 'integer' || t === 'number') return 'number'
    if (t === 'boolean') return 'boolean'
    if (t === 'null') return 'null'
    return 'unknown'
  })

  return parts.length > 0 ? parts.join(' | ') : 'unknown'
}

/**
 * @param {unknown} value
 */
function literal(value) {
  return typeof value === 'string' ? JSON.stringify(value) : String(value)
}

/**
 * @param {string} key
 */
function ident(key) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : JSON.stringify(key)
}

/**
 * @param {string} type
 */
function paren(type) {
  return type.includes('|') || type.includes('&') ? `(${type})` : type
}

/**
 * @param {string} file
 */
async function loadDefs(file) {
  const raw = JSON.parse(await readFile(join(schemaDir, file), 'utf8'))
  return /** @type {Record<string, unknown>} */ (raw.$defs ?? {})
}

const [hostDefs, eventDefs, resultDefs] = await Promise.all([
  loadDefs('host-commands.json'),
  loadDefs('module-events.json'),
  loadDefs('results.json'),
])

const hostTypes = Object.keys(hostDefs)
const eventTypes = Object.keys(eventDefs)
const resultTypes = Object.keys(resultDefs)

const blocks = []

for (const [name, schema] of Object.entries(hostDefs)) {
  blocks.push(
    `export type ${name}Payload = ${tsType(schema, '')}`,
  )
}
for (const [name, schema] of Object.entries(eventDefs)) {
  blocks.push(
    `export type ${name}Payload = ${tsType(schema, '')}`,
  )
}
for (const [name, schema] of Object.entries(resultDefs)) {
  blocks.push(
    `export type ${name}Payload = ${tsType(schema, '')}`,
  )
}

const payloadMapLines = [
  ...hostTypes.map((name) => `  ${name}: ${name}Payload`),
  ...eventTypes.map((name) => `  ${name}: ${name}Payload`),
  ...resultTypes.map((name) => `  ${name}: ${name}Payload`),
]

const hostUnion = hostTypes.map((name) => `  | ProtocolEnvelope<'${name}'>`).join('\n')
const eventUnion = eventTypes.map((name) => `  | ProtocolEnvelope<'${name}'>`).join('\n')
const resultUnion = resultTypes.map((name) => `  | ProtocolEnvelope<'${name}'>`).join('\n')

const source = `/**
 * GENERATED FILE — do not edit by hand.
 * Source of truth: JSON Schema Draft 2020-12 in schemas/1.0.
 * Regenerate with: yarn workspace @nipoto/support-protocol generate
 */

export const HOST_COMMAND_TYPES = ${JSON.stringify(hostTypes)} as const
export const MODULE_EVENT_TYPES = ${JSON.stringify(eventTypes)} as const
export const RESULT_TYPES = ${JSON.stringify(resultTypes)} as const

export type HostCommandType = (typeof HOST_COMMAND_TYPES)[number]
export type ModuleEventType = (typeof MODULE_EVENT_TYPES)[number]
export type ResultType = (typeof RESULT_TYPES)[number]
export type MessageType = HostCommandType | ModuleEventType | ResultType

${blocks.join('\n\n')}

export interface PayloadByType {
${payloadMapLines.join('\n')}
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
${hostUnion}

export type ModuleEvent =
${eventUnion}

export type CommandResult =
${resultUnion}

export type ProtocolMessage = HostCommand | ModuleEvent | CommandResult
`

await mkdir(dirname(outFile), { recursive: true })
await writeFile(outFile, `${source}\n`)
console.log(`wrote ${outFile}`)
