import type { PayloadByType } from '@nipoto/support-protocol'
import type { DomainEvent } from '@nipoto/support-sdk'

import { extractConversationId } from './conversation'
import { isValidConversationId } from './routes'

export type ConversationState = PayloadByType['CONVERSATION_STATE_CHANGED']['state']

export type MappedDomainEvent = {
  source: DomainEvent['source']
  name: string
  generation: number
  conversationId?: string
  conversationState?: ConversationState
  data: unknown
}

const STATE_BY_BACKEND_EVENT: Record<string, ConversationState> = {
  opened: 'opened',
  queued: 'queued',
  closed: 'closed',
  processing: 'processing',
  conveyed: 'conveyed',
  chatOpen: 'opened',
  chatClosed: 'closed',
}

export function mapBackendEventToDomain(event: DomainEvent): MappedDomainEvent {
  const conversationId = extractConversationId(event.data)
  const conversationState = STATE_BY_BACKEND_EVENT[event.name]
  return {
    source: event.source,
    name: event.name,
    generation: event.generation,
    data: event.data,
    ...(isValidConversationId(conversationId) ? { conversationId } : {}),
    ...(conversationState === undefined ? {} : { conversationState }),
  }
}

export function eventTouchesThread(event: MappedDomainEvent): boolean {
  return (
    event.name === 'messageSent' ||
    event.name === 'file' ||
    event.name === 'seenMessage' ||
    event.name === 'chatSystemMessage'
  )
}
