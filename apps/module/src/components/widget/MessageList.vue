<script setup lang="ts">
import { nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppearance } from '@/composables/useAppearance'
import type { ChatMessage, MessageListItem } from '@/domain'

import MessageBubble from './MessageBubble.vue'

const props = withDefaults(
  defineProps<{
    items: MessageListItem[]
    userId?: string
    empty?: boolean
  }>(),
  {
    userId: undefined,
    empty: false,
  },
)

const emit = defineEmits<{
  visible: []
}>()

const { t } = useI18n()
const appearance = useAppearance()

function dateLabel(item: Extract<MessageListItem, { kind: 'separator' }>): string {
  const time = Date.parse(item.sentAt)
  if (!Number.isFinite(time)) {
    return item.dateKey
  }
  return new Intl.DateTimeFormat(appearance.locale, {
    dateStyle: 'medium',
  }).format(time)
}

function messageOf(item: MessageListItem): ChatMessage | null {
  return item.kind === 'message' ? item.message : null
}

watch(
  () => props.items.length,
  async () => {
    await nextTick()
    emit('visible')
  },
)
</script>

<template>
  <ScrollArea class="min-h-0 flex-1">
    <div class="flex flex-col gap-3 px-3 py-4">
      <p
        v-if="empty"
        class="py-8 text-center text-sm text-muted-foreground"
      >
        {{ t('widget.emptyMessages') }}
      </p>
      <template
        v-for="item in items"
        :key="item.kind === 'separator' ? item.id : item.message.id"
      >
        <div
          v-if="item.kind === 'separator'"
          class="text-center text-[11px] text-muted-foreground"
        >
          {{ dateLabel(item) }}
        </div>
        <MessageBubble
          v-else-if="messageOf(item)"
          :message="messageOf(item)!"
          :user-id="userId"
          :locale="appearance.locale"
        />
      </template>
    </div>
  </ScrollArea>
</template>
