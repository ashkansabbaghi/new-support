export type BridgeMessageMeta = {
  origin: string
  source: MessageEventSource | null
  ports: readonly MessagePort[]
  via: 'window' | 'port'
}

export type BridgeTransport = {
  isEmbedded(): boolean
  inferHostOrigin(): string | null
  getEntryUrl(): { search: string; hash: string }
  post(data: unknown, targetOrigin: string): void
  subscribe(handler: (data: unknown, meta: BridgeMessageMeta) => void): () => void
  adoptPort?(port: MessagePort): void
}

function parseOrigin(value: string): string | null {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function createWindowTransport(): BridgeTransport {
  const hasWindow = typeof window !== 'undefined'
  let dedicatedPort: MessagePort | null = null
  let handler: ((data: unknown, meta: BridgeMessageMeta) => void) | null = null

  const deliverPort = (event: MessageEvent) => {
    if (!handler) {
      return
    }
    handler(event.data, {
      origin: '',
      source: dedicatedPort,
      ports: [],
      via: 'port',
    })
  }

  return {
    isEmbedded() {
      return hasWindow && window.parent !== window
    },
    inferHostOrigin() {
      if (!hasWindow) {
        return null
      }
      const ancestors = window.location.ancestorOrigins
      if (ancestors && ancestors.length > 0) {
        return ancestors[0] ?? null
      }
      if (document.referrer) {
        return parseOrigin(document.referrer)
      }
      return null
    },
    getEntryUrl() {
      if (!hasWindow) {
        return { search: '', hash: '' }
      }
      return { search: window.location.search, hash: window.location.hash }
    },
    post(data, targetOrigin) {
      if (dedicatedPort) {
        dedicatedPort.postMessage(data)
        return
      }
      if (!hasWindow || window.parent === window) {
        return
      }
      if (!targetOrigin || targetOrigin === '*') {
        return
      }
      window.parent.postMessage(data, targetOrigin)
    },
    adoptPort(port) {
      if (dedicatedPort === port) {
        return
      }
      if (dedicatedPort) {
        dedicatedPort.removeEventListener('message', deliverPort)
        dedicatedPort.close()
      }
      dedicatedPort = port
      port.addEventListener('message', deliverPort)
      port.start()
    },
    subscribe(nextHandler) {
      handler = nextHandler
      if (!hasWindow) {
        return () => {
          handler = null
        }
      }
      const listener = (event: MessageEvent) => {
        if (event.source !== window.parent) {
          return
        }
        nextHandler(event.data, {
          origin: event.origin,
          source: event.source,
          ports: event.ports ? Array.from(event.ports) : [],
          via: 'window',
        })
      }
      window.addEventListener('message', listener)
      return () => {
        window.removeEventListener('message', listener)
        if (dedicatedPort) {
          dedicatedPort.removeEventListener('message', deliverPort)
          dedicatedPort.close()
          dedicatedPort = null
        }
        handler = null
      }
    },
  }
}
