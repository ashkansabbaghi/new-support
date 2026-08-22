import { computed, ref, watch } from 'vue'

import {
  reportUnreadCount,
  supportQueryClient,
  useConversation,
  useConversationMessages,
  useMarkSeenMutation,
  useSendFileMutation,
  useSendTextMutation,
} from '@/application'
import { queryKeys } from '@/application/queryKeys'
import {
  isOutgoingMessage,
  isSystemMessage,
  toChatMessageList,
  withDateSeparators,
  type ChatMessage,
} from '@/domain'

export function useThreadMessages(
  conversationId: () => string | undefined,
  options: { viewerId?: () => string | undefined } = {},
) {
  const conversationQuery = useConversation(computed(() => conversationId()))
  const messagesQuery = useConversationMessages(
    computed(() => {
      const id = conversationId()
      return id ? { conversationId: id } : undefined
    }),
  )
  const sendMutation = useSendTextMutation()
  const sendFileMutation = useSendFileMutation()
  const seenMutation = useMarkSeenMutation()
  const optimistic = ref<ChatMessage[]>([])

  const userId = computed(() => conversationQuery.data.value?.userId)
  const viewerId = computed(() => options.viewerId?.() ?? userId.value)

  const remote = computed(() => toChatMessageList(messagesQuery.data.value))

  const messages = computed(() => {
    const remoteIds = new Set(remote.value.map((item) => item.id))
    const pending = optimistic.value.filter((item) => !remoteIds.has(item.id) && item.pending)
    return [...remote.value, ...pending]
  })

  const items = computed(() => withDateSeparators(messages.value))

  watch(
    messages,
    (next) => {
      const unread = next.filter(
        (item) =>
          !item.seen &&
          !item.pending &&
          !isSystemMessage(item) &&
          !isOutgoingMessage(item, viewerId.value),
      )
      reportUnreadCount(unread.length)
    },
    { immediate: true },
  )

  async function sendText(text: string): Promise<void> {
    const id = conversationId()
    const trimmed = text.trim()
    if (!id || !trimmed) {
      return
    }

    const pending: ChatMessage = {
      id: `local_${Date.now()}`,
      conversationId: id,
      from: viewerId.value,
      text: trimmed,
      type: null,
      sentAt: new Date().toISOString(),
      seen: false,
      pending: true,
      hasAttachment: false,
    }
    optimistic.value = [...optimistic.value, pending]

    try {
      await sendMutation.mutateAsync({ conversationId: id, text: trimmed })
      optimistic.value = optimistic.value.filter((item) => item.id !== pending.id)
    } catch {
      optimistic.value = optimistic.value.map((item) =>
        item.id === pending.id ? { ...item, pending: false, failed: true } : item,
      )
    }
  }

  async function sendFile(file: File): Promise<void> {
    const id = conversationId()
    if (!id) {
      return
    }

    const pending: ChatMessage = {
      id: `local_file_${Date.now()}`,
      conversationId: id,
      from: viewerId.value,
      text: '',
      type: 'file',
      sentAt: new Date().toISOString(),
      seen: false,
      pending: true,
      hasAttachment: true,
    }
    optimistic.value = [...optimistic.value, pending]

    try {
      await sendFileMutation.mutateAsync({ conversationId: id, file })
      optimistic.value = optimistic.value.filter((item) => item.id !== pending.id)
    } catch (error) {
      optimistic.value = optimistic.value.filter((item) => item.id !== pending.id)
      throw error
    }
  }

  function markVisibleSeen(): void {
    const id = conversationId()
    if (!id) {
      return
    }
    const unseen = messages.value
      .filter(
        (item) =>
          !item.seen &&
          !item.pending &&
          !isSystemMessage(item) &&
          !isOutgoingMessage(item, viewerId.value),
      )
      .map((item) => item.id)
    if (unseen.length === 0) {
      return
    }
    seenMutation.mutate({ conversationId: id, messageIds: unseen })
  }

  function refresh(): void {
    const id = conversationId()
    if (!id) {
      return
    }
    void supportQueryClient.invalidateQueries({ queryKey: queryKeys.conversations.messages(id) })
  }

  return {
    conversation: conversationQuery,
    messages,
    items,
    userId: viewerId,
    isPending: messagesQuery.isPending,
    sendText,
    sendFile,
    sending: computed(() => sendMutation.isPending.value || sendFileMutation.isPending.value),
    markVisibleSeen,
    refresh,
  }
}
