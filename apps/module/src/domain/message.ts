import { sanitizeChatHtml } from '@/lib/sanitizeHtml'

import { unwrapBackendList } from './conversation'

export { toPlainText } from '@/lib/sanitizeHtml'

export type ChatMessage = {
  id: string
  conversationId?: string
  from?: string
  text: string
  html?: string
  type?: string | null
  sentAt?: string
  seen: boolean
  pending?: boolean
  failed?: boolean
  hasAttachment: boolean
  attachmentId?: string
}

export type MessageListItem =
  | { kind: 'separator'; id: string; dateKey: string; sentAt: string }
  | { kind: 'message'; message: ChatMessage }

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

function attachmentIdOf(record: Record<string, unknown>): string | undefined {
  const attachments = record.attachments
  if (Array.isArray(attachments) && attachments[0] != null) {
    const first = attachments[0]
    if (typeof first === 'string' && first.length > 0) {
      return first
    }
    const nested = asRecord(first)
    if (nested) {
      return pickString(nested, ['id', 'file', 'fileId', 'fileID', '_id'])
    }
  }
  const file = record.file
  if (typeof file === 'string' && file.length > 0) {
    return file
  }
  const nestedFile = asRecord(file)
  if (nestedFile) {
    return pickString(nestedFile, ['id', 'file', 'fileId', 'fileID', '_id'])
  }
  return pickString(record, ['fileId', 'fileID', 'attachmentId', 'attachment'])
}

function hasAttachments(record: Record<string, unknown>): boolean {
  const attachments = record.attachments
  if (Array.isArray(attachments)) {
    return attachments.length > 0
  }
  if (attachments && typeof attachments === 'object') {
    return Object.keys(attachments).length > 0
  }
  return record.type === 'file'
}

function normalizeType(value: unknown): string | null {
  if (value == null || value === '') {
    return null
  }
  const type = String(value)
  if (type === 'chatSystemMessage') {
    return 'system'
  }
  return type
}

function isSeen(record: Record<string, unknown>): boolean {
  if (record.views === true || record.seen === true) {
    return true
  }
  if (Array.isArray(record.views)) {
    return record.views.length > 0
  }
  return false
}

export function toChatMessage(raw: unknown): ChatMessage | null {
  if (typeof raw === 'string' && raw.length > 0) {
    return {
      id: raw,
      text: '',
      seen: false,
      hasAttachment: false,
    }
  }

  const record = asRecord(raw)
  if (!record) {
    return null
  }

  const id = pickString(record, ['id', 'messageID', 'messageId', '_id'])
  if (!id) {
    return null
  }

  const rendered = sanitizeChatHtml(record.text ?? record.message ?? record.body)
  const attachmentId = attachmentIdOf(record)

  return {
    id,
    text: rendered.text,
    seen: isSeen(record),
    hasAttachment: hasAttachments(record) || Boolean(attachmentId),
    type: normalizeType(record.type),
    ...(rendered.kind === 'html' ? { html: rendered.html } : {}),
    ...(attachmentId ? { attachmentId } : {}),
    ...(pickString(record, ['chatID', 'chatId', 'chat', 'conversationId'])
      ? { conversationId: pickString(record, ['chatID', 'chatId', 'chat', 'conversationId']) }
      : {}),
    ...(pickString(record, ['from', 'fromId', 'sender', 'user'])
      ? { from: pickString(record, ['from', 'fromId', 'sender', 'user']) }
      : {}),
    ...(pickString(record, ['sentAt', 'createdAt', 'created_at'])
      ? { sentAt: pickString(record, ['sentAt', 'createdAt', 'created_at']) }
      : {}),
  }
}

export function toChatMessageList(raw: unknown): ChatMessage[] {
  const messages: ChatMessage[] = []
  for (const item of unwrapBackendList(raw)) {
    const message = toChatMessage(item)
    if (message) {
      messages.push(message)
    }
  }
  return messages.sort((left, right) => {
    const leftTime = left.sentAt ? Date.parse(left.sentAt) : 0
    const rightTime = right.sentAt ? Date.parse(right.sentAt) : 0
    return leftTime - rightTime
  })
}

export function dateKeyFor(sentAt: string | undefined): string | null {
  if (!sentAt) {
    return null
  }
  const time = Date.parse(sentAt)
  if (!Number.isFinite(time)) {
    return null
  }
  return new Date(time).toISOString().slice(0, 10)
}

export function withDateSeparators(messages: ChatMessage[]): MessageListItem[] {
  const items: MessageListItem[] = []
  let lastKey: string | null = null

  for (const message of messages) {
    const dateKey = dateKeyFor(message.sentAt)
    if (dateKey && dateKey !== lastKey) {
      items.push({
        kind: 'separator',
        id: `date-${dateKey}`,
        dateKey,
        sentAt: message.sentAt ?? dateKey,
      })
      lastKey = dateKey
    }
    items.push({ kind: 'message', message })
  }

  return items
}

export function isOutgoingMessage(message: ChatMessage, userId?: string): boolean {
  if (message.pending || message.failed) {
    return true
  }
  if (!userId || !message.from) {
    return false
  }
  return message.from === userId
}

export function isSystemMessage(message: ChatMessage): boolean {
  return message.type === 'system' || message.type === 'date'
}
