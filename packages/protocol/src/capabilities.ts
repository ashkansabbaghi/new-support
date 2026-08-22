export const V1_CAPABILITIES = [
  'lifecycle',
  'session',
  'navigation',
  'locale',
  'theme',
  'network',
  'visibility',
  'unread',
  'conversation-state',
  'external-navigation',
  'notification',
  'auth',
] as const

export type V1Capability = (typeof V1_CAPABILITIES)[number]

const known = new Set<string>(V1_CAPABILITIES)

export function isKnownCapability(name: string): name is V1Capability {
  return known.has(name)
}

export function findUnknownCapabilities(required: readonly string[]): string[] {
  return required.filter((name) => !isKnownCapability(name))
}
