/**
 * In-memory send coalescing. Not an offline queue (ADR-007).
 * Retry is a no-op after a backend ack; a failed send (ack missing) may run again.
 */
export function createMutationLedger() {
  const acked = new Map<string, unknown>()
  const inflight = new Map<string, Promise<unknown>>()

  return {
    async run<T>(key: string, send: () => Promise<T>): Promise<T> {
      if (acked.has(key)) {
        return acked.get(key) as T
      }
      const existing = inflight.get(key)
      if (existing) {
        return existing as Promise<T>
      }

      const work = send()
        .then((result) => {
          acked.set(key, result)
          return result
        })
        .finally(() => {
          inflight.delete(key)
        })
      inflight.set(key, work)
      return work
    },
    hasAck(key: string): boolean {
      return acked.has(key)
    },
    isInflight(key: string): boolean {
      return inflight.has(key)
    },
    clear(): void {
      acked.clear()
      inflight.clear()
    },
  }
}

export type MutationLedger = ReturnType<typeof createMutationLedger>

export function mutationAttemptKey(kind: string, explicit?: string): string {
  if (explicit && explicit.length > 0) {
    return explicit
  }
  const unique = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${kind}:${unique}`
}
