import type { ConversationStatus } from './conversation'

const STATUS_ALIASES: Record<string, ConversationStatus> = {
  queued: 'queued',
  processing: 'processing',
  opened: 'opened',
  reopened: 'reopened',
  'staff replied': 'staff-replied',
  'staff-replied': 'staff-replied',
  staff_replied: 'staff-replied',
  'user replied': 'user-replied',
  'user-replied': 'user-replied',
  user_replied: 'user-replied',
  conveyed: 'conveyed',
  requeued: 'requeued',
  closed: 'closed',
}

export const UI_STATUSES: ConversationStatus[] = [
  'queued',
  'processing',
  'opened',
  'reopened',
  'staff-replied',
  'user-replied',
  'conveyed',
  'requeued',
  'closed',
]

export function normalizeConversationStatus(value: string | undefined): ConversationStatus | undefined {
  if (!value) {
    return undefined
  }
  return STATUS_ALIASES[value] ?? STATUS_ALIASES[value.toLowerCase()]
}

export function statusI18nKey(status: string | undefined): string {
  const normalized = normalizeConversationStatus(status)
  return normalized ? `widget.status.${normalized}` : 'widget.status.opened'
}
