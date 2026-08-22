import { cookieNameForSide, inferSideFromHostname, type SupportSide } from '../side.js'

export function parseCookie(name: string, source: string): string | undefined {
  if (!source) {
    return undefined
  }
  const parts = source.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) {
      continue
    }
    const key = decodeURIComponent(trimmed.slice(0, eq).trim())
    if (key === name) {
      return decodeURIComponent(trimmed.slice(eq + 1))
    }
  }
  return undefined
}

export function readDocumentCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined
  }
  return parseCookie(name, document.cookie)
}

/**
 * Upload / REST authorization header value. Same names as legacy authToken.js.
 * Returns the raw cookie (host may store `Bearer …`). Never log this.
 */
export function getAuthToken(
  side?: SupportSide,
  hostname?: string,
  cookieSource?: string,
): string | undefined {
  const source =
    cookieSource ?? (typeof document === 'undefined' ? '' : document.cookie)

  if (side) {
    return parseCookie(cookieNameForSide(side), source)
  }

  const inferred = inferSideFromHostname(hostname)
  const preferred = parseCookie(cookieNameForSide(inferred), source)
  if (preferred) {
    return preferred
  }
  return parseCookie(cookieNameForSide(inferred === 'staff' ? 'user' : 'staff'), source)
}

export function hasAuthCookie(side: SupportSide, cookieSource?: string): boolean {
  return Boolean(getAuthToken(side, undefined, cookieSource))
}
