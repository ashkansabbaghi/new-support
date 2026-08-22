import { createI18n } from 'vue-i18n'

import enUS from './en-US'
import faIR from './fa-IR'

export const SUPPORT_LOCALES = ['fa-IR', 'en-US'] as const

export type SupportLocale = (typeof SUPPORT_LOCALES)[number]

export const DEFAULT_LOCALE: SupportLocale = 'fa-IR'

export function directionForLocale(locale: SupportLocale): 'rtl' | 'ltr' {
  return locale === 'fa-IR' ? 'rtl' : 'ltr'
}

export function toSupportLocale(locale: string): SupportLocale {
  if (locale === 'en-US' || locale.startsWith('en')) {
    return 'en-US'
  }
  return 'fa-IR'
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: 'en-US',
  messages: {
    'fa-IR': faIR,
    'en-US': enUS,
  },
})
