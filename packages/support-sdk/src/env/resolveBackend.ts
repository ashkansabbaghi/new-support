/**
 * Allowlisted backend discovery. Localhost may set ABR_URL / ABR_WS_URL to an
 * allowlisted host. Deployed builds derive the `back` sibling from the frontend
 * hostname — arbitrary backend URLs are rejected.
 */

const NUMBERED_ENVIRONMENT = /^[a-z]\d+$/i
const NUMBERED_BACK_HOST = /^[a-z]\d+-back\.nipoto\.(pro|com)$/i
const MOBILE_FRONT_HOST = /^m\.nipoto\.org$/i
const MOBILE_BACK_HOST = 'b.nipoto.org'

const ALLOWED_BASE_DOMAINS = new Set(['nipoto.com', 'nipoto.pro', 'nipoto.org'])

const ALLOWED_NAMED_ENVS = new Set(['stage2'])

const ALLOWED_EXACT_HOSTS = new Set([
  'b1-back.nipoto.pro',
  'b5-back.nipoto.pro',
  'back-stage2.nipoto.pro',
  'back.nipoto.com',
  'back.nipoto.pro',
  'b.nipoto.org',
])

const DEFAULT_LOCAL_BACK_HOST = 'b1-back.nipoto.pro'

export type BackendEnvInput = {
  hostname?: string
  protocol?: string
  abrUrl?: string
  abrWsUrl?: string
}

export type ResolvedBackend = {
  host: string
  restUrl: string
  wsUrl: string
  source: 'env' | 'sibling' | 'default'
}

export function parseConfiguredHost(rawEnvValue: string | undefined): string | null {
  if (!rawEnvValue) {
    return null
  }
  return rawEnvValue.replace(/^wss?:\/\//, '').replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
}

export function isAllowedBackHost(host: string): boolean {
  const hostname = host.split(':')[0].toLowerCase()
  if (ALLOWED_EXACT_HOSTS.has(hostname)) {
    return true
  }
  return NUMBERED_BACK_HOST.test(hostname)
}

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.split(':')[0]
  return !host || host === 'localhost' || host.endsWith('.localhost') || /^[0-9.]+$/.test(host)
}

function isSecureHost(host: string): boolean {
  const hostname = host.split(':')[0]
  return hostname !== 'localhost' && !/^\d/.test(hostname)
}

function splitHost(hostname: string): { subdomain: string; baseDomain: string } {
  const parts = hostname.toLowerCase().split(':')[0].split('.')
  if (parts.length <= 2) {
    return { subdomain: '', baseDomain: parts.join('.') }
  }
  return {
    subdomain: parts.slice(0, -2).join('.'),
    baseDomain: parts.slice(-2).join('.'),
  }
}

function environmentName(subdomain: string): string {
  if (NUMBERED_ENVIRONMENT.test(subdomain)) {
    return subdomain
  }
  const dash = subdomain.indexOf('-')
  if (dash === -1) {
    return ''
  }
  const before = subdomain.slice(0, dash)
  const after = subdomain.slice(dash + 1)
  return NUMBERED_ENVIRONMENT.test(before) ? before : after
}

export function siblingHost(service: string, hostname: string): string {
  const { subdomain, baseDomain } = splitHost(hostname)
  const environment = environmentName(subdomain)
  if (!environment) {
    return `${service}.${baseDomain}`
  }
  return NUMBERED_ENVIRONMENT.test(environment)
    ? `${environment}-${service}.${baseDomain}`
    : `${service}-${environment}.${baseDomain}`
}

function assertAllowedBase(hostname: string): void {
  const { baseDomain } = splitHost(hostname)
  if (!ALLOWED_BASE_DOMAINS.has(baseDomain)) {
    throw new Error(`[resolveBackend] frontend host "${hostname}" is outside the allowlisted domains`)
  }
}

function assertAllowedBackHost(host: string): string {
  const normalized = host.split(':')[0].toLowerCase()
  if (!isAllowedBackHost(normalized)) {
    throw new Error(`[resolveBackend] backend host "${normalized}" is not allowlisted`)
  }
  return normalized
}

function deriveSiblingBackHost(hostname: string): string {
  if (MOBILE_FRONT_HOST.test(hostname.split(':')[0])) {
    return MOBILE_BACK_HOST
  }

  assertAllowedBase(hostname)
  const { subdomain, baseDomain } = splitHost(hostname)
  const environment = environmentName(subdomain)

  if (environment && !NUMBERED_ENVIRONMENT.test(environment) && !ALLOWED_NAMED_ENVS.has(environment)) {
    throw new Error(`[resolveBackend] environment "${environment}" is not an allowlisted env id`)
  }

  if (baseDomain === 'nipoto.org' && !MOBILE_FRONT_HOST.test(hostname.split(':')[0])) {
    throw new Error(`[resolveBackend] unsupported nipoto.org host "${hostname}"`)
  }

  return siblingHost('back', hostname)
}

function withHttpProtocol(host: string, protocol?: string): string {
  if (protocol === 'https:' || isSecureHost(host)) {
    return `https://${host}`
  }
  return `http://${host}`
}

function withSocketProtocol(host: string, protocol?: string): string {
  if (protocol === 'https:' || isSecureHost(host)) {
    return `wss://${host}`
  }
  return `ws://${host}`
}

function currentHostname(): string {
  return typeof window === 'undefined' ? '' : window.location.hostname
}

function currentProtocol(): string {
  return typeof window === 'undefined' ? '' : window.location.protocol
}

/**
 * Resolve REST + WebSocket backend URLs.
 * `ABR_URL` / `ABR_WS_URL` are consulted only on localhost / IP.
 */
export function resolveBackend(input: BackendEnvInput = {}): ResolvedBackend {
  const hostname = input.hostname ?? currentHostname()
  const protocol = input.protocol ?? currentProtocol()

  if (isLocalHostname(hostname)) {
    const configured = parseConfiguredHost(input.abrUrl) ?? DEFAULT_LOCAL_BACK_HOST
    const host = assertAllowedBackHost(configured)
    const wsHost = parseConfiguredHost(input.abrWsUrl)
    if (wsHost && wsHost !== host) {
      throw new Error('[resolveBackend] ABR_WS_URL host must match the allowlisted ABR_URL host')
    }
    if (wsHost) {
      assertAllowedBackHost(wsHost)
    }
    return {
      host,
      restUrl: withHttpProtocol(host, protocol),
      wsUrl: `wss://${wsHost ?? host}`,
      source: input.abrUrl ? 'env' : 'default',
    }
  }

  const host = assertAllowedBackHost(deriveSiblingBackHost(hostname))
  return {
    host,
    restUrl: withHttpProtocol(host, protocol),
    wsUrl: withSocketProtocol(host, protocol),
    source: 'sibling',
  }
}

export function resolveBackHost(input: BackendEnvInput = {}): string {
  return resolveBackend(input).host
}

export function resolveBackUrl(input: BackendEnvInput = {}): string {
  return resolveBackend(input).restUrl
}

export function resolveSocketUrl(input: BackendEnvInput = {}): string {
  return resolveBackend(input).wsUrl
}

export const LOCAL_DEFAULT_BACK_HOST = DEFAULT_LOCAL_BACK_HOST
