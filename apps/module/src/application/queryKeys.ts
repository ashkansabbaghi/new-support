import type { ChatListFilter, ConversationQuery, Pagination } from '@nipoto/support-sdk'

import type { SemanticRouteName } from '@/domain'

export const queryKeys = {
  conversations: {
    root: ['conversations'] as const,
    open: (page?: Pagination & { filter?: ChatListFilter }) =>
      ['conversations', 'open', page ?? {}] as const,
    queued: (page?: Pagination) => ['conversations', 'queued', page ?? {}] as const,
    closed: (page?: Pagination & { filter?: ChatListFilter }) =>
      ['conversations', 'closed', page ?? {}] as const,
    active: (page?: Pagination) => ['conversations', 'active', page ?? {}] as const,
    list: (query?: ConversationQuery) => ['conversations', 'list', query ?? {}] as const,
    counts: {
      open: (filter?: ChatListFilter) => ['conversations', 'count', 'open', filter ?? 'self'] as const,
      queued: () => ['conversations', 'count', 'queued'] as const,
      closed: () => ['conversations', 'count', 'closed'] as const,
      active: () => ['conversations', 'count', 'active'] as const,
      list: (query?: ConversationQuery) => ['conversations', 'count', 'list', query ?? {}] as const,
    },
    /**
     * ticket.view and conversation.view share this key — same Conversation.
     */
    detail: (conversationId: string) => ['conversations', 'detail', conversationId] as const,
    messages: (conversationId: string) => ['conversations', 'messages', conversationId] as const,
  },
  departments: {
    list: () => ['departments'] as const,
    page: (input?: { page?: number; rowsPerPage?: number }) =>
      ['departments', 'page', input ?? {}] as const,
    count: () => ['departments', 'count'] as const,
  },
  faqs: {
    list: (input?: { department?: string; page?: number }) => ['faqs', input ?? {}] as const,
    page: (input?: { department?: string; page?: number }) =>
      ['faqs', 'admin', input ?? {}] as const,
    count: (department?: string) => ['faqs', 'count', department ?? null] as const,
    tags: () => ['faqs', 'tags'] as const,
  },
  predetermined: {
    list: (input?: Pagination) => ['predetermined', input ?? {}] as const,
    count: () => ['predetermined', 'count'] as const,
    categories: () => ['predetermined', 'categories'] as const,
  },
  staff: {
    list: () => ['staff'] as const,
    available: () => ['staff', 'available'] as const,
    me: () => ['staff', 'me'] as const,
    availability: () => ['staff', 'availability'] as const,
    status: (id: string) => ['staff', 'status', id] as const,
  },
  conversationUser: {
    detail: (conversationId: string, userId: string) =>
      ['conversation-user', conversationId, userId] as const,
  },
  files: {
    support: (id: string, thumbnail: boolean) => ['files', 'support', id, thumbnail] as const,
  },
} as const

export function conversationDetailKeyForRoute(
  name: SemanticRouteName,
  conversationId: string,
): readonly unknown[] {
  void name
  return queryKeys.conversations.detail(conversationId)
}
