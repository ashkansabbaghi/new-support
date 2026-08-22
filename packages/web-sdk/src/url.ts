import { entryUrlContainsToken } from '@nipoto/support-protocol'

import { LOCALE_PATTERN, WIDGET_ID_PATTERN } from './constants.js'
import { SupportSdkError } from './errors.js'
import { exactOrigin } from './origin.js'

export function assertSafeModuleUrl(href: string): string {
  let parsed: URL
  try {
    parsed = new URL(href)
  } catch {
    throw new SupportSdkError('invalid module URL', 'FORBIDDEN_URL')
  }
  if (entryUrlContainsToken({ search: parsed.search, hash: parsed.hash })) {
    throw new SupportSdkError('refusing to put credentials in the iframe URL', 'FORBIDDEN_URL')
  }
  return parsed.toString()
}

export function buildModuleEntryUrl(
  origin: string,
  query: { widgetId: string; locale?: string },
): string {
  const url = new URL('/', exactOrigin(origin))
  if (!WIDGET_ID_PATTERN.test(query.widgetId) || query.widgetId.length > 64) {
    throw new SupportSdkError('widget-id is public but must be a safe identifier', 'INVALID_WIDGET_ID')
  }
  url.searchParams.set('widgetId', query.widgetId)
  if (query.locale) {
    if (!LOCALE_PATTERN.test(query.locale)) {
      throw new SupportSdkError('invalid locale', 'INVALID_LOCALE')
    }
    url.searchParams.set('locale', query.locale)
  }
  return assertSafeModuleUrl(url.toString())
}

/** Fallback only. Never put tokens or PII in the URL. */
export function buildDeepLinkUrl(
  origin: string,
  routeName = 'conversation.home',
): string {
  const path = routeName.replaceAll('.', '/')
  return assertSafeModuleUrl(`${exactOrigin(origin)}/#/${path}`)
}
