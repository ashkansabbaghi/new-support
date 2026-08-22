import { LOCALE_PATTERN } from './constants.js'
import { SupportSdkError } from './errors.js'
import type { SupportDirection } from './types.js'

export function directionForLocale(locale: string): SupportDirection {
  const lang = locale.split('-')[0]?.toLowerCase()
  return lang === 'fa' || lang === 'ar' || lang === 'he' || lang === 'ur' ? 'rtl' : 'ltr'
}

export function assertLocale(locale: string): string {
  if (!LOCALE_PATTERN.test(locale)) {
    throw new SupportSdkError('invalid locale', 'INVALID_LOCALE')
  }
  return locale
}
