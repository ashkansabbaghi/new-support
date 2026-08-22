import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  DEFAULT_LOCALE,
  directionForLocale,
  type SupportLocale,
} from '@/i18n'

export type SupportTheme = 'light' | 'dark'
export type SupportDirection = 'rtl' | 'ltr'

export const useAppearanceStore = defineStore('appearance', () => {
  const locale = ref<SupportLocale>(DEFAULT_LOCALE)
  const theme = ref<SupportTheme>('light')
  const direction = computed<SupportDirection>(() => directionForLocale(locale.value))

  function setLocale(next: SupportLocale) {
    locale.value = next
  }

  function setTheme(next: SupportTheme) {
    theme.value = next
  }

  function toggleLocale() {
    locale.value = locale.value === 'fa-IR' ? 'en-US' : 'fa-IR'
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return {
    locale,
    theme,
    direction,
    setLocale,
    setTheme,
    toggleLocale,
    toggleTheme,
  }
})
