<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { Conversation } from '@/domain'

import StatusBadge from './StatusBadge.vue'

defineProps<{
  conversations: Conversation[]
  emptyKey: string
}>()

const emit = defineEmits<{
  select: [conversation: Conversation]
}>()

const { t } = useI18n()

function label(conversation: Conversation): string {
  return conversation.title || conversation.id
}
</script>

<template>
  <ScrollArea class="min-h-0 flex-1">
    <p
      v-if="conversations.length === 0"
      class="px-4 py-10 text-center text-sm text-muted-foreground"
    >
      {{ t(emptyKey) }}
    </p>
    <ul
      v-else
      class="space-y-2 p-3"
    >
      <li
        v-for="conversation in conversations"
        :key="conversation.id"
      >
        <button
          type="button"
          class="flex w-full items-start justify-between gap-2 rounded-support bg-support-surface-muted px-3 py-2 text-start"
          @click="emit('select', conversation)"
        >
          <span class="min-w-0">
            <span class="block truncate text-sm font-medium">{{ label(conversation) }}</span>
            <span class="block truncate text-xs text-muted-foreground">
              {{ conversation.departmentName || conversation.staffName || conversation.id }}
            </span>
          </span>
          <StatusBadge :status="conversation.status" />
        </button>
      </li>
    </ul>
  </ScrollArea>
</template>
