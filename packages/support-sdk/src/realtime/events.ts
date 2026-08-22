/**
 * Backend / ABR event names only. Do not invent WebSocket names.
 * Widget aliases (CHAT_OPENED, NEW_MESSAGE, …) stay in the presentation layer.
 */
export const BACKEND_CHAT_EVENTS = [
  'opened',
  'queued',
  'closed',
  'messageSent',
  'processing',
  'conveyed',
  'availed',
  'unAvailed',
] as const

export const ABR_NOTIFICATION_TYPES = [
  'chatOpen',
  'chatClosed',
  'chatSystemMessage',
  'file',
  'messageSent',
  'seenMessage',
] as const

export type BackendChatEvent = (typeof BACKEND_CHAT_EVENTS)[number]
export type AbrNotificationType = (typeof ABR_NOTIFICATION_TYPES)[number]

export type DomainEvent = {
  source: 'aggregate' | 'userNotification' | 'bus'
  name: string
  generation: number
  data: unknown
}

export function isKnownBackendEvent(name: string): boolean {
  return (
    (BACKEND_CHAT_EVENTS as readonly string[]).includes(name) ||
    (ABR_NOTIFICATION_TYPES as readonly string[]).includes(name)
  )
}

export function mapUserNotification(data: unknown, generation: number): DomainEvent | null {
  if (!data || typeof data !== 'object' || !('type' in data)) {
    return null
  }
  const type = (data as { type: unknown }).type
  if (typeof type !== 'string' || !(ABR_NOTIFICATION_TYPES as readonly string[]).includes(type)) {
    return null
  }
  return {
    source: 'userNotification',
    name: type,
    generation,
    data,
  }
}
