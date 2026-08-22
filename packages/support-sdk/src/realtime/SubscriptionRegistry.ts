import type { AbrSubscription } from '../app.js'

export type SubscriptionKey = string

export function subscriptionKey(instanceId: string, key: string): SubscriptionKey {
  return `${instanceId}:${key}`
}

export function createSubscriptionRegistry() {
  const entries = new Map<SubscriptionKey, AbrSubscription>()

  return {
    has(id: SubscriptionKey): boolean {
      return entries.has(id)
    },
    get(id: SubscriptionKey): AbrSubscription | undefined {
      return entries.get(id)
    },
    add(id: SubscriptionKey, subscription: AbrSubscription): void {
      const previous = entries.get(id)
      previous?.cancel?.()
      entries.set(id, subscription)
    },
    remove(id: SubscriptionKey): void {
      const previous = entries.get(id)
      previous?.cancel?.()
      entries.delete(id)
    },
    clear(): void {
      for (const subscription of entries.values()) {
        try {
          subscription.cancel?.()
        } catch {
          // ignore
        }
      }
      entries.clear()
    },
    keys(): SubscriptionKey[] {
      return [...entries.keys()]
    },
    size(): number {
      return entries.size
    },
  }
}

export type SubscriptionRegistry = ReturnType<typeof createSubscriptionRegistry>
