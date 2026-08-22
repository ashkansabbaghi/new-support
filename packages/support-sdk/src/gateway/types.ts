import type { SupportSide } from '../side.js'

export type ChatListFilter = 'self' | 'other'

/** Stable id for reconnect retry. Distinct user actions must use distinct keys. */
export type MutationAttempt = {
  attemptKey?: string
}

export type Pagination = {
  startRow?: number
  rowsPerPage?: number
}

export type ConversationQuery = Pagination & {
  title?: string
  status?: string | readonly string[]
  staff?: string
  department?: string
  updatedAtFrom?: string
  updatedAtTo?: string
  sortBy?: string
}

export type OpenChatInput = MutationAttempt & {
  department: string
  title: string
}

export type ChatIdInput = MutationAttempt & {
  chat: string
}

export type SendMessageInput = MutationAttempt & {
  chat: string
  message: string
}

export type ChatMessagesInput = unknown

export type UploadAvatarInput = {
  file: string
  size: number
  mimeType: string
  name: string
}

export type UploadFileInput = {
  side?: SupportSide
  [key: string]: unknown
}

export type SendFileInput = MutationAttempt & {
  chatID: string
  [key: string]: unknown
}

export type ConveyChatInput = MutationAttempt & {
  chatID: string
  data: unknown
}

export type SeenMessageInput = {
  chatID: string
  messagesID: unknown
}

export type FaqListInput = {
  department?: string | null
  page?: number
}

export type DepartmentListInput = {
  page?: number
  id?: string | null
  rowsPerPage?: number
}

export type PredeterminedListInput = {
  startRow?: number
  rowsPerPage?: number
}
