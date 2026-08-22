export type SupportSide = 'user' | 'staff'

export const USER_TOKEN_COOKIE = 'user-token'
export const STAFF_TOKEN_COOKIE = 'staff-token'

export type AuthCookieName = typeof USER_TOKEN_COOKIE | typeof STAFF_TOKEN_COOKIE

export function cookieNameForSide(side: SupportSide): AuthCookieName {
  return side === 'staff' ? STAFF_TOKEN_COOKIE : USER_TOKEN_COOKIE
}

export function inferSideFromHostname(
  hostname = typeof window === 'undefined' ? '' : window.location.hostname,
): SupportSide {
  return hostname.split(':')[0].toLowerCase().includes('staff') ? 'staff' : 'user'
}
