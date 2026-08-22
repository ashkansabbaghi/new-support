/**
 * Conversation is the only support thread model.
 * Chat and Ticket are surfaces / workflows on `$app.Support.Chat`, not a Ticket entity.
 */

export type ConversationSurface = 'chat' | 'ticket'

export type ConversationStatus =
  | 'queued'
  | 'processing'
  | 'opened'
  | 'reopened'
  | 'staff-replied'
  | 'user-replied'
  | 'conveyed'
  | 'requeued'
  | 'closed'

export type Conversation = {
  id: string
  chatID?: string
  title?: string
  status?: string
  departmentId?: string
  departmentName?: string
  staffId?: string
  staffName?: string
  userId?: string
  userName?: string
  createdAt?: string
  updatedAt?: string
  queuedAt?: string
  openedAt?: string
  closedAt?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickString(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }
  return undefined
}

export function unwrapBackendList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw
  }
  const record = asRecord(raw)
  if (!record) {
    return raw == null ? [] : [raw]
  }
  for (const key of ['data', 'items', 'rows', 'result'] as const) {
    const nested = record[key]
    if (Array.isArray(nested)) {
      return nested
    }
  }
  return [raw]
}

export function toConversation(raw: unknown): Conversation | null {
  if (typeof raw === 'string' && raw.length > 0) {
    return { id: raw }
  }

  const record = asRecord(raw)
  if (!record) {
    return null
  }

  const nested = record.data
  if (nested && typeof nested === 'object' && !record.id && !record.chatID && !record.chat) {
    return toConversation(nested)
  }

  const id = pickString(record, ['id', 'chatID', 'chatId', 'chat', '_id'])
  if (!id) {
    return null
  }

  const title = pickString(record, ['title'])
  const status = pickString(record, ['status'])
  const departmentId = pickString(record, ['department', 'departmentId'])
  const departmentName = pickString(record, ['departmentName', 'department_name'])
  const staffId = pickString(record, ['staff', 'staffId'])
  const staffName = pickString(record, ['staffName', 'staff_name'])
  const userId = pickString(record, ['user', 'userId', 'userID'])
  const userData = asRecord(record.userData)
  const userName =
    pickString(record, ['userName', 'user_name']) ??
    (userData
      ? [pickString(userData, ['firstName']), pickString(userData, ['lastName'])]
          .filter(Boolean)
          .join(' ')
          .trim() || pickString(userData, ['mobile'])
      : undefined)
  const chatID = pickString(record, ['chatID', 'chatId'])
  const createdAt = pickString(record, ['createdAt', 'created_at'])
  const updatedAt = pickString(record, ['updatedAt', 'updated_at'])
  const queuedAt = pickString(record, ['queuedAt', 'queued_at'])
  const openedAt = pickString(record, ['openedAt', 'opened_at'])
  const closedAt = pickString(record, ['closedAt', 'closed_at'])

  return {
    id,
    ...(chatID === undefined ? {} : { chatID }),
    ...(title === undefined ? {} : { title }),
    ...(status === undefined ? {} : { status }),
    ...(departmentId === undefined ? {} : { departmentId }),
    ...(departmentName === undefined ? {} : { departmentName }),
    ...(staffId === undefined ? {} : { staffId }),
    ...(staffName === undefined ? {} : { staffName }),
    ...(userId === undefined ? {} : { userId }),
    ...(userName ? { userName } : {}),
    ...(createdAt === undefined ? {} : { createdAt }),
    ...(updatedAt === undefined ? {} : { updatedAt }),
    ...(queuedAt === undefined ? {} : { queuedAt }),
    ...(openedAt === undefined ? {} : { openedAt }),
    ...(closedAt === undefined ? {} : { closedAt }),
  }
}

export function isQueuedConversation(conversation: Conversation): boolean {
  if (conversation.status === 'queued' || conversation.status === 'requeued') {
    return true
  }
  return Boolean(conversation.queuedAt && !conversation.openedAt && !conversation.closedAt)
}

export function resolveOpenOutcome(raw: unknown): {
  conversation: Conversation
  state: 'opened' | 'queued'
} {
  const conversation = toConversation(raw)
  if (!conversation) {
    throw new Error('[support] openConversation returned no conversation')
  }
  return {
    conversation,
    state: isQueuedConversation(conversation) ? 'queued' : 'opened',
  }
}

export function toConversationList(raw: unknown): Conversation[] {
  const conversations: Conversation[] = []
  for (const item of unwrapBackendList(raw)) {
    const conversation = toConversation(item)
    if (conversation) {
      conversations.push(conversation)
    }
  }
  return conversations
}

export function extractConversationId(data: unknown): string | undefined {
  if (typeof data === 'string' && data.length > 0) {
    return data
  }
  const record = asRecord(data)
  if (!record) {
    return undefined
  }
  return pickString(record, ['conversationId', 'chatID', 'chatId', 'chat', 'id'])
}
