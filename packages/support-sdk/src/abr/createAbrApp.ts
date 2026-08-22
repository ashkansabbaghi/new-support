import Abr, { Auth } from '@abr/client'

import type { SupportApp } from '../app.js'
import type { SupportSide } from '../side.js'
import { cookieNameForSide } from '../side.js'

function currentHostname(): string {
  return typeof window === 'undefined' ? 'localhost' : window.location.hostname.split(':')[0]
}

function toBaseDomain(hostname: string): string {
  const parts = hostname.split('.')
  if (parts.length === 1 || /^[0-9.]+$/.test(hostname)) {
    return hostname
  }
  return parts.slice(-2).join('.')
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || /^[0-9.]+$/.test(hostname)
}

/**
 * Same cookie attributes as staff / website / user-panel hosts:
 * `Abr(url)` then `Auth.cookieName` + domain / secure / SameSite.
 * Cookie is the credential; we never write a token from SESSION_SET.
 */
export function configureAbrAuth(side: SupportSide, hostname = currentHostname()): void {
  Auth.cookieName = cookieNameForSide(side)

  if (isLocalHost(hostname)) {
    Auth.cookieAttributes.secure = false
    delete Auth.cookieAttributes.domain
    Auth.cookieAttributes.sameSite = 'Lax'
    return
  }

  Auth.cookieAttributes.domain = `.${toBaseDomain(hostname)}`
  Auth.cookieAttributes.secure = true
  Auth.cookieAttributes.sameSite = 'Lax'
}

export type CreateAbrAppOptions = {
  wsUrl: string
  side: SupportSide
  hostname?: string
}

export async function createAbrApp(options: CreateAbrAppOptions): Promise<SupportApp> {
  configureAbrAuth(options.side, options.hostname ?? currentHostname())
  const instance = (await Abr(options.wsUrl)) as SupportApp
  if (instance.$abr?.auth?.cookieAttributes) {
    instance.$abr.auth.cookieAttributes.sameSite = 'Lax'
  }
  return instance
}

/**
 * Close the ABR socket without letting @abr/client auto-reconnect.
 * Does not delete host cookies (`user-token` / `staff-token`).
 */
export function disconnectAbrApp(app: SupportApp | null | undefined): void {
  if (!app?.$abr?.socket) {
    return
  }
  const socket = app.$abr.socket
  if (socket.reconnectTimeoutId !== undefined) {
    clearTimeout(socket.reconnectTimeoutId as ReturnType<typeof setTimeout>)
  }
  // Truthy sentinel: Socket.onclose only schedules reconnect when this is unset.
  socket.reconnectTimeoutId = -1
  try {
    socket.ws?.close()
  } catch {
    // already closed
  }
}
