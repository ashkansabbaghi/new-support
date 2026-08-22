export type SessionGenerationSnapshot = {
  generation: number
  hasSession: boolean
}

/**
 * Late events from a previous SESSION_SET / reconnect must not touch query cache or UI.
 * Credentials stay in SessionManager; this only compares generations.
 */
export function shouldAcceptSessionEvent(
  eventGeneration: number,
  snapshot: SessionGenerationSnapshot,
): boolean {
  return snapshot.hasSession && eventGeneration === snapshot.generation
}

export class StaleSessionError extends Error {
  readonly generation: number

  constructor(generation: number) {
    super('stale-session-generation')
    this.name = 'StaleSessionError'
    this.generation = generation
  }
}

export function assertCurrentGeneration(
  expected: number,
  snapshot: SessionGenerationSnapshot,
): void {
  if (!shouldAcceptSessionEvent(expected, snapshot)) {
    throw new StaleSessionError(expected)
  }
}
