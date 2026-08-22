import type { DomainEvent } from '@nipoto/support-sdk'

import {
  eventTouchesThread,
  mapBackendEventToDomain,
  type ConversationState,
  type MappedDomainEvent,
} from '@/domain'

import { queryKeys } from './queryKeys'
import { shouldAcceptSessionEvent, type SessionGenerationSnapshot } from './sessionGuard'

export type DomainEventHandler = {
  onAccept?: (event: MappedDomainEvent) => void
  onConversationState?: (payload: {
    conversationId: string
    state: ConversationState
  }) => void
  onIgnore?: (event: DomainEvent) => void
}

export function handleIncomingDomainEvent(
  event: DomainEvent,
  snapshot: SessionGenerationSnapshot,
  handler: DomainEventHandler = {},
): MappedDomainEvent | null {
  if (!shouldAcceptSessionEvent(event.generation, snapshot)) {
    handler.onIgnore?.(event)
    return null
  }

  const mapped = mapBackendEventToDomain(event)
  handler.onAccept?.(mapped)

  if (mapped.conversationId && mapped.conversationState) {
    handler.onConversationState?.({
      conversationId: mapped.conversationId,
      state: mapped.conversationState,
    })
  }

  return mapped
}

export function queryKeysForDomainEvent(event: MappedDomainEvent): Array<readonly unknown[]> {
  const keys: Array<readonly unknown[]> = [queryKeys.conversations.root]
  if (event.name === 'availed' || event.name === 'unAvailed') {
    keys.push(queryKeys.staff.list())
    keys.push(queryKeys.staff.available())
    keys.push(queryKeys.staff.availability())
  }
  if (!event.conversationId) {
    return keys
  }
  keys.push(queryKeys.conversations.detail(event.conversationId))
  if (eventTouchesThread(event)) {
    keys.push(queryKeys.conversations.messages(event.conversationId))
  }
  return keys
}
