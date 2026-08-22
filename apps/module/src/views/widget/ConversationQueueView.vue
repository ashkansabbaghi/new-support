<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConversation, useQueuedConversations } from '@/application'
import FirstMessageForm from '@/components/widget/FirstMessageForm.vue'
import QueueState from '@/components/widget/QueueState.vue'
import { useThreadMessages } from '@/composables/useThreadMessages'
import { useWidgetNavigation } from '@/composables/useWidgetNavigation'
import { isQueuedConversation } from '@/domain'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const ui = useUiStore()
const { go } = useWidgetNavigation()
const queuedQuery = useQueuedConversations({})

const conversationId = computed(() => {
  if (ui.activeConversationId) {
    return ui.activeConversationId
  }
  return queuedQuery.data.value?.[0]?.id
})

watch(
  conversationId,
  (id) => {
    if (id) {
      ui.setActiveConversationId(id)
    }
  },
  { immediate: true },
)

const conversationQuery = useConversation(conversationId)
const thread = useThreadMessages(() => conversationId.value)
const messages = thread.messages
const sending = thread.sending
const messagesPending = thread.isPending
const conversation = computed(() => conversationQuery.data.value)

const needsFirstMessage = computed(() => {
  if (messagesPending.value) {
    return false
  }
  return messages.value.filter((item) => !item.type).length === 0
})

watch(
  conversation,
  (current) => {
    if (!current) {
      return
    }
    if (!isQueuedConversation(current) && current.id) {
      void go({
        name: 'conversation.view',
        params: { conversationId: current.id },
        replace: true,
      })
    }
  },
)

async function sendFirst(text: string): Promise<void> {
  await thread.sendText(text)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <p
      v-if="!conversationId"
      class="p-6 text-center text-sm text-muted-foreground"
    >
      {{ t('chat.chatLists.queueChat.empty') }}
    </p>
    <FirstMessageForm
      v-else-if="needsFirstMessage"
      :title="conversation?.title || ui.startTitle"
      :department-name="conversation?.departmentName"
      :sending="sending"
      @send="sendFirst"
    />
    <QueueState
      v-else-if="conversationId"
      :conversation-id="conversationId"
    />
  </div>
</template>
