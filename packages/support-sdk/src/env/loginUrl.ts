import { isLocalHostname, siblingHost } from './resolveBackend.js'
import type { SupportSide } from '../side.js'

export const LOCAL_USER_LOGIN_URL = 'http://localhost:8081/login'
export const LOCAL_STAFF_LOGIN_URL = 'http://localhost:8082/loginOtp-management'

function currentHostname(): string {
  return typeof window === 'undefined' ? '' : window.location.hostname
}

/**
 * Login lives in the user / staff hosts. This module does not render a login UI.
 */
export function resolveLoginUrl(
  side: SupportSide,
  hostname = currentHostname(),
): string {
  if (isLocalHostname(hostname)) {
    return side === 'staff' ? LOCAL_STAFF_LOGIN_URL : LOCAL_USER_LOGIN_URL
  }

  const service = side === 'staff' ? 'staff' : 'app'
  const host = siblingHost(service, hostname)
  const path = side === 'staff' ? '/loginOtp-management' : '/login'
  return `https://${host}${path}`
}
