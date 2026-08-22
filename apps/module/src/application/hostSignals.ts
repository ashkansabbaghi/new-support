import type { PayloadByType } from '@nipoto/support-protocol'

import { isValidConversationId, type ConversationState, type MappedDomainEvent } from '@/domain'

export type NotificationRequest = PayloadByType['NOTIFICATION_REQUESTED']

type ConversationStateSink = (payload: {
  conversationId: string
  state: ConversationState
}) => void

type UnreadSink = (count: number) => void
type NotificationSink = (payload: NotificationRequest) => void
type ResizeSink = (size: { width: number; height: number }) => void

let conversationStateSink: ConversationStateSink | null = null
let unreadSink: UnreadSink | null = null
let notificationSink: NotificationSink | null = null
let resizeSink: ResizeSink | null = null
let hostForeground = true

export function setConversationStateSink(sink: ConversationStateSink | null): void {
  conversationStateSink = sink
}

export function setUnreadCountSink(sink: UnreadSink | null): void {
  unreadSink = sink
}

export function setNotificationSink(sink: NotificationSink | null): void {
  notificationSink = sink
}

export function setResizeSink(sink: ResizeSink | null): void {
  resizeSink = sink
}

export function setHostForeground(next: boolean): void {
  hostForeground = next
}

export function isHostForeground(): boolean {
  return hostForeground
}

export function reportConversationState(payload: {
  conversationId: string
  state: ConversationState
}): void {
  conversationStateSink?.(payload)
}

export function reportUnreadCount(count: number): void {
  unreadSink?.(count)
}

/** Privacy-safe only: kind / optional conversation id. Never include message body. */
export function requestHostNotification(payload: NotificationRequest): void {
  const conversationId =
    payload.conversationId && isValidConversationId(payload.conversationId)
      ? payload.conversationId
      : undefined
  notificationSink?.({
    kind: payload.kind,
    ...(conversationId ? { conversationId } : {}),
  })
}

export function requestHostResize(size: { width: number; height: number }): void {
  resizeSink?.(size)
}

export function notificationForDomainEvent(
  event: MappedDomainEvent,
  activeConversationId?: string,
): NotificationRequest | null {
  const viewingActive =
    hostForeground &&
    Boolean(event.conversationId) &&
    event.conversationId === activeConversationId

  if (event.name === 'messageSent' || event.name === 'file') {
    if (viewingActive) {
      return null
    }
    return {
      kind: 'new-message',
      ...(event.conversationId ? { conversationId: event.conversationId } : {}),
    }
  }

  if (event.conversationState === 'queued' || event.name === 'queued') {
    if (viewingActive) {
      return null
    }
    return {
      kind: 'queue',
      ...(event.conversationId ? { conversationId: event.conversationId } : {}),
    }
  }

  if (event.conversationState && event.conversationState !== 'opened') {
    if (viewingActive && event.conversationState !== 'closed') {
      return null
    }
    return {
      kind: 'conversation-state',
      ...(event.conversationId ? { conversationId: event.conversationId } : {}),
    }
  }

  return null
}
