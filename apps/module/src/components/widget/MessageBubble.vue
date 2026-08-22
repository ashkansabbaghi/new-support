<script setup lang="ts">
/* eslint-disable vue/no-v-html -- HTML is module-sanitized with a scheme allowlist */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { Check, CheckCheck } from '@lucide/vue'

import { useSupportFile } from '@/application'
import { isOutgoingMessage, isSystemMessage, type ChatMessage } from '@/domain'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    message: ChatMessage
    userId?: string
    locale?: string
  }>(),
  {
    userId: undefined,
    locale: 'fa-IR',
  },
)

const { t } = useI18n()

const outgoing = computed(() => isOutgoingMessage(props.message, props.userId))
const system = computed(() => isSystemMessage(props.message))
const fileQuery = useSupportFile(
  computed(() =>
    props.message.attachmentId
      ? { id: props.message.attachmentId, thumbnail: true }
      : undefined,
  ),
)
const thumbnailUrl = computed(() => fileQuery.data.value ?? '')

const timeLabel = computed(() => {
  if (!props.message.sentAt) {
    return ''
  }
  const time = Date.parse(props.message.sentAt)
  if (!Number.isFinite(time)) {
    return ''
  }
  return new Intl.DateTimeFormat(props.locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(time)
})

const systemText = computed(() => {
  const key = props.message.text
  const mapped: Record<string, string> = {
    joined: outgoing.value ? t('chat.conversation.you-joined') : t('chat.conversation.other-joined', [t('chat.global.operator')]),
    left: outgoing.value ? t('chat.conversation.you-left') : t('chat.conversation.other-left', [t('chat.global.operator')]),
    conveyed: outgoing.value ? t('chat.conversation.conveyed-by-you') : t('chat.conversation.conveyed-by-other', [t('chat.global.operator')]),
    processing: t('chat.conversation.processing'),
    closed: t('chat.conversation.closed'),
    departmentChanged: t('chat.conversation.departmentChanged'),
    unreadMessage: t('chat.conversation.unreadMessage'),
  }
  return mapped[key] ?? key
})
</script>

<template>
  <div
    v-if="system"
    class="mx-auto max-w-[90%] rounded-support-chip bg-support-surface-muted px-3 py-1 text-center text-[11px] text-muted-foreground"
  >
    {{ systemText }}
  </div>
  <div
    v-else
    :class="cn('flex', outgoing ? 'justify-end' : 'justify-start')"
  >
    <div
      :class="cn(
        'max-w-[85%] rounded-support px-3 py-2 text-sm break-words',
        outgoing
          ? 'text-white'
          : 'bg-support-incoming text-support-incoming-foreground',
        message.pending && 'opacity-70',
        message.failed && 'ring-1 ring-destructive',
      )"
      :style="outgoing ? { backgroundImage: 'var(--support-gradient-sent)' } : undefined"
    >
      <!-- eslint-disable-next-line vue/no-v-html -- HTML is module-sanitized with a scheme allowlist -->
      <div
        v-if="message.html"
        class="support-chat-html whitespace-pre-wrap"
        v-html="message.html"
      />
      <p
        v-else-if="message.text"
        class="whitespace-pre-wrap"
      >
        {{ message.text }}
      </p>
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        alt=""
        class="mt-2 max-h-48 max-w-full rounded-support object-contain"
      >
      <p
        v-else-if="message.hasAttachment"
        class="mt-1 text-[11px] opacity-80"
      >
        {{ t('widget.attachment') }}
      </p>
      <p class="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-80">
        <span>{{ timeLabel }}</span>
        <CheckCheck
          v-if="outgoing && message.seen"
          class="size-3"
        />
        <Check
          v-else-if="outgoing"
          class="size-3"
        />
      </p>
    </div>
  </div>
</template>
