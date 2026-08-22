import {
  createSessionManager,
  createSupportGateway,
  type AuthRequiredReason,
  type SessionManager,
  type SupportGateway,
  type SupportSide,
} from '@nipoto/support-sdk'

import { readModuleBackendEnv } from './env'

let sessionManager: SessionManager | null = null
let gateway: SupportGateway | null = null
let authRequiredHandler: ((reason: AuthRequiredReason, generation: number) => void) | undefined

export function getSessionManager(): SessionManager | null {
  return sessionManager
}

export function getSupportGateway(): SupportGateway | null {
  return gateway
}

export function ensureSessionManager(options: {
  instanceId: string
  side?: SupportSide
  onAuthRequired?: (reason: AuthRequiredReason, generation: number) => void
}): SessionManager {
  if (options.onAuthRequired) {
    authRequiredHandler = options.onAuthRequired
  }

  if (!sessionManager) {
    sessionManager = createSessionManager({
      instanceId: options.instanceId,
      side: options.side,
      env: readModuleBackendEnv(),
      hooks: {
        onAuthRequired(reason, generation) {
          authRequiredHandler?.(reason, generation)
        },
      },
    })
    gateway = createSupportGateway({
      session: sessionManager,
      env: readModuleBackendEnv(),
    })
  } else if (options.side) {
    sessionManager.setSide(options.side)
  }

  return sessionManager
}
