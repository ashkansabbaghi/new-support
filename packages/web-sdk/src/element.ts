import { createSupportClient } from './client.js'
import type { SupportClient, SupportSide } from './types.js'

const ELEMENT_NAME = 'nipoto-support-module'

/**
 * Optional iframe wrapper. Does not render Support UI into the host or Shadow DOM.
 */
export class NipotoSupportModuleElement extends HTMLElement {
  #client: SupportClient | null = null
  #box: HTMLDivElement | null = null

  static get observedAttributes(): string[] {
    return ['widget-id', 'locale', 'origin', 'side']
  }

  get client(): SupportClient | null {
    return this.#client
  }

  connectedCallback(): void {
    if (this.#client) {
      return
    }
    const widgetId = this.getAttribute('widget-id')
    const origin = this.getAttribute('origin')
    if (!widgetId || !origin) {
      return
    }
    const box = document.createElement('div')
    box.setAttribute('data-nipoto-support-slot', 'iframe')
    this.appendChild(box)
    this.#box = box
    const locale = this.getAttribute('locale') ?? undefined
    const side = this.getAttribute('side')
    this.#client = createSupportClient({
      origin,
      widgetId,
      locale,
      side: side === 'staff' || side === 'user' ? (side as SupportSide) : undefined,
      container: box,
    })
  }

  disconnectedCallback(): void {
    void this.#client?.dispose()
    this.#client = null
    this.#box?.remove()
    this.#box = null
  }
}

export function defineNipotoSupportModule(): void {
  if (typeof customElements === 'undefined') {
    return
  }
  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, NipotoSupportModuleElement)
  }
}
