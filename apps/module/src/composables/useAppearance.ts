import { useAppearanceStore } from '@/stores/appearance'

/** Locale / theme from HOST_INIT, LOCALE_SET, THEME_SET; kitchen still toggles locally. */
export function useAppearance() {
  return useAppearanceStore()
}
