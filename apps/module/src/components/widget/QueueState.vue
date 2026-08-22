<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useCloseConversationMutation, useQueuedConversations } from '@/application'
import { Button } from '@/components/ui/button'
import { reportConversationState } from '@/application'
import { useWidgetNavigation } from '@/composables/useWidgetNavigation'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{
  conversationId: string
}>()

const { t } = useI18n()
const ui = useUiStore()
const { go } = useWidgetNavigation()
const queuedQuery = useQueuedConversations({})
const closeMutation = useCloseConversationMutation()

const queueCount = computed(() => queuedQuery.data.value?.length ?? 0)

async function cancel(): Promise<void> {
  await closeMutation.mutateAsync(props.conversationId)
  reportConversationState({ conversationId: props.conversationId, state: 'closed' })
  ui.setActiveConversationId(null)
  await go({ name: 'conversation.home', replace: true })
}
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
    <p class="text-6xl font-bold tabular-nums text-foreground">
      {{ queueCount }}
    </p>
    <p class="text-sm text-muted-foreground">
      {{ t('chat.queue.in-queue') }}
    </p>
    <p class="text-sm text-muted-foreground">
      {{ t('chat.queue.queue-info') }}
    </p>
    <Button
      type="button"
      variant="secondary"
      class="w-full"
      :disabled="closeMutation.isPending"
      @click="cancel"
    >
      {{ t('chat.queue.cancel') }}
    </Button>
  </div>
</template>
