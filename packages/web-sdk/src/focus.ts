import type { SupportIframeHandle } from './types.js'

export function createFocusHandoff() {
  let previous: HTMLElement | null = null

  return {
    enter(iframe: SupportIframeHandle | null) {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        previous = document.activeElement
      }
      iframe?.focus()
      iframe?.contentWindow?.focus()
    },
    restore() {
      previous?.focus()
      previous = null
    },
    clear() {
      previous = null
    },
  }
}
