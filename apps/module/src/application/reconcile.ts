import { queryKeys } from './queryKeys'
import { supportQueryClient } from './queryClient'

/**
 * After reconnect or HOST_FOREGROUND, lists and the active thread are
 * re-queried. Realtime replay is not the source of truth.
 */
export function refetchActiveListAndThread(conversationId?: string): void {
  void supportQueryClient.invalidateQueries({ queryKey: queryKeys.conversations.root })
  if (!conversationId) {
    return
  }
  void supportQueryClient.invalidateQueries({
    queryKey: queryKeys.conversations.detail(conversationId),
  })
  void supportQueryClient.invalidateQueries({
    queryKey: queryKeys.conversations.messages(conversationId),
  })
}

export function invalidateDomainEventKeys(keys: ReadonlyArray<readonly unknown[]>): void {
  for (const queryKey of keys) {
    void supportQueryClient.invalidateQueries({ queryKey: [...queryKey] })
  }
}

export function clearServerState(): void {
  supportQueryClient.clear()
}
