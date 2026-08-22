import type { BackendEnvInput } from '@nipoto/support-sdk'

export function readModuleBackendEnv(): BackendEnvInput {
  return {
    hostname: typeof window === 'undefined' ? 'localhost' : window.location.hostname,
    protocol: typeof window === 'undefined' ? '' : window.location.protocol,
    abrUrl: import.meta.env.ABR_URL,
    abrWsUrl: import.meta.env.ABR_WS_URL,
  }
}
