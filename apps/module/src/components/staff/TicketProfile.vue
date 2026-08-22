<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useConversationUser } from '@/application'
import StatusBadge from '@/components/widget/StatusBadge.vue'
import { ticketStatusI18nKey } from '@/composables/useStaffActor'
import { formatConversationDate, type Conversation } from '@/domain'
import { useAppearance } from '@/composables/useAppearance'

const props = defineProps<{
  conversation: Conversation
}>()

const { t } = useI18n()
const appearance = useAppearance()

const userQuery = useConversationUser(
  computed(() =>
    props.conversation.userId
      ? { conversationId: props.conversation.id, userId: props.conversation.userId }
      : undefined,
  ),
)

const name = computed(
  () =>
    userQuery.data.value?.name ||
    props.conversation.userName ||
    t('staff.profile.user'),
)
</script>

<template>
  <aside class="rounded-support border border-border bg-card p-4">
    <p class="text-sm font-semibold">
      {{ name }}
    </p>
    <dl class="mt-4 space-y-3 text-sm">
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t('staff.profile.status') }}
        </dt>
        <dd class="mt-1 flex items-center gap-2">
          <StatusBadge :status="conversation.status" />
          <span class="text-xs text-muted-foreground">
            {{ t(ticketStatusI18nKey(conversation.status)) }}
          </span>
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t('staff.profile.chatId') }}
        </dt>
        <dd class="mt-1 font-mono text-xs">
          {{ conversation.chatID || conversation.id }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted-foreground">
          {{ t('staff.profile.updated') }}
        </dt>
        <dd class="mt-1">
          {{ formatConversationDate(conversation.updatedAt, appearance.locale) }}
        </dd>
      </div>
    </dl>
  </aside>
</template>
