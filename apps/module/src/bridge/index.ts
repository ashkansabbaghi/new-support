import { createModuleBridge, type BridgeHandle, type InitBridgeOptions } from './runtime'

export type { BridgeHandle, InitBridgeOptions } from './runtime'
export { MODULE_VERSION } from './runtime'
export { getSessionManager } from './session'

let handle: BridgeHandle | null = null

/** Boot hook for main.ts. Protocol and lifecycle live in this folder, not in App.vue. */
export function initBridge(options: InitBridgeOptions = {}): BridgeHandle {
  if (handle) {
    return handle
  }
  handle = createModuleBridge(options)
  return handle
}

export function getBridge(): BridgeHandle | null {
  return handle
}
