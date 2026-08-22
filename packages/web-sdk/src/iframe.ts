import { HOST_ROOT_ID, HOST_STYLE_ID, IFRAME_SANDBOX } from './constants.js'
import type { SupportHostContainer, SupportIframeHandle } from './types.js'

const HOST_CSS = `
#${HOST_ROOT_ID}{
  position:fixed;
  inset-inline-end:16px;
  inset-block-end:16px;
  z-index:2147483646;
  width:0;
  height:0;
  overflow:hidden;
  pointer-events:none;
}
#${HOST_ROOT_ID}[data-open="true"]{
  width:var(--nipoto-support-width,380px);
  height:var(--nipoto-support-height,640px);
  pointer-events:auto;
}
#${HOST_ROOT_ID} iframe{
  display:block;
  width:100%;
  height:100%;
  border:0;
  border-radius:12px;
  background:transparent;
}
`

export function createDomIframe(input: {
  src: string
  sandbox: string
  title: string
  container: HTMLElement
  onLoad: () => void
}): SupportIframeHandle {
  const iframe = document.createElement('iframe')
  iframe.src = input.src
  iframe.setAttribute('sandbox', input.sandbox || IFRAME_SANDBOX)
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  iframe.setAttribute('title', input.title)
  iframe.setAttribute('tabindex', '-1')
  iframe.addEventListener('load', input.onLoad, { once: true })
  input.container.appendChild(iframe)
  return {
    focus() {
      iframe.focus()
    },
    remove() {
      iframe.remove()
    },
    get contentWindow() {
      return iframe.contentWindow
    },
  }
}

export function createDomContainer(parent?: HTMLElement): SupportHostContainer {
  const doc = document
  let style = doc.getElementById(HOST_STYLE_ID)
  if (!style) {
    style = doc.createElement('style')
    style.id = HOST_STYLE_ID
    style.textContent = HOST_CSS
    doc.head.appendChild(style)
  }

  const root = doc.createElement('div')
  root.id = HOST_ROOT_ID
  root.dataset.nipotoSupport = 'true'
  root.dataset.open = 'false'
  ;(parent ?? doc.body).appendChild(root)

  return {
    applyOpen(size) {
      root.style.setProperty('--nipoto-support-width', `${size.width}px`)
      root.style.setProperty('--nipoto-support-height', `${size.height}px`)
      root.dataset.open = 'true'
    },
    applyClose() {
      root.dataset.open = 'false'
    },
    dispose() {
      root.remove()
      const leftover = doc.getElementById(HOST_ROOT_ID)
      if (!leftover) {
        doc.getElementById(HOST_STYLE_ID)?.remove()
      }
    },
    element: root,
  }
}

export function getHostRootElement(container: SupportHostContainer | null): HTMLElement | null {
  if (container?.element && typeof HTMLElement !== 'undefined' && container.element instanceof HTMLElement) {
    return container.element
  }
  return typeof document === 'undefined' ? null : document.getElementById(HOST_ROOT_ID)
}
