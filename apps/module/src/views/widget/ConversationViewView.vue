<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import Composer from '@/components/widget/Composer.vue'
import MessageList from '@/components/widget/MessageList.vue'
import StatusBadge from '@/components/widget/StatusBadge.vue'
import { useThreadMessages } from '@/composables/useThreadMessages'
import { isQueuedConversation } from '@/domain'
import { useUiStore } from '@/stores/ui'
import { useWidgetNavigation } from '@/composables/useWidgetNavigation'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()
const { go } = useWidgetNavigation()

const conversationId = computed(() => {
  const raw = route.params.conversationId
  return Array.isArray(raw) ? raw[0] : raw
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

const thread = useThreadMessages(() => conversationId.value)
const items = thread.items
const messages = thread.messages
const userId = thread.userId
const sending = thread.sending
const messagesPending = thread.isPending
const conversation = computed(() => thread.conversation.data.value)
const composer = ref<{ showFileError: (error: unknown) => void } | null>(null)

async function attachFile(file: File): Promise<void> {
  try {
    await thread.sendFile(file)
  } catch (error) {
    composer.value?.showFileError(error)
  }
}

watch(
  conversation,
  (current) => {
    if (current && isQueuedConversation(current)) {
      void go({ name: 'conversation.queue', replace: true })
    }
  },
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
      <p class="truncate text-sm font-medium">
        {{ conversation?.title || t('chat.global.support-title') }}
      </p>
      <StatusBadge :status="conversation?.status" />
    </div>
    <p
      v-if="thread.conversation.isError"
      class="px-3 py-2 text-xs text-destructive"
    >
      {{ t('widget.loadError') }}
    </p>
    <MessageList
      :items="items"
      :user-id="userId"
      :empty="!messagesPending && messages.length === 0"
      @visible="thread.markVisibleSeen()"
    />
    <Composer
      ref="composer"
      :disabled="conversation?.status === 'closed'"
      :sending="sending"
      @send="thread.sendText"
      @attach="attachFile"
    />
  </div>
</template>
