<script setup lang="ts">
/* eslint-disable vue/no-v-html -- HTML is module-sanitized with a scheme allowlist */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useFaqs } from '@/application'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toFaqList, toPlainText } from '@/domain'
import { sanitizeChatHtml } from '@/lib/sanitizeHtml'

const props = defineProps<{
  departmentId: string
}>()

const emit = defineEmits<{
  start: []
  back: []
}>()

const { t } = useI18n()
const faqsQuery = useFaqs(computed(() => ({ department: props.departmentId, page: 0 })))
const faqs = computed(() => toFaqList(faqsQuery.data.value))
const openId = ref<string | null>(null)
const selected = computed(() => faqs.value.find((item) => item.id === openId.value) ?? null)
const selectedBody = computed(() => sanitizeChatHtml(selected.value?.answer || selected.value?.excerpt || ''))

defineExpose({
  isEmpty: computed(() => !faqsQuery.isPending.value && faqs.value.length === 0),
  isPending: faqsQuery.isPending,
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <p class="px-1 pb-3 text-sm text-muted-foreground">
      {{ t('chat.faq.intro') }}
    </p>

    <ScrollArea class="min-h-0 flex-1">
      <ul class="space-y-2 pe-3">
        <li
          v-for="faq in faqs"
          :key="faq.id"
        >
          <button
            type="button"
            class="w-full rounded-support bg-support-surface-muted px-3 py-2 text-start text-sm"
            @click="openId = faq.id"
          >
            <span class="font-medium">{{ faq.question }}</span>
            <span
              v-if="toPlainText(faq.excerpt)"
              class="mt-1 block text-xs text-muted-foreground"
            >
              {{ toPlainText(faq.excerpt) }}
            </span>
          </button>
        </li>
      </ul>
    </ScrollArea>

    <div class="mt-4 flex gap-2">
      <Button
        type="button"
        class="flex-1 shadow-support-primary"
        @click="emit('start')"
      >
        {{ t('chat.global.continue') }}
      </Button>
      <Button
        type="button"
        variant="outline"
        @click="emit('back')"
      >
        {{ t('widget.back') }}
      </Button>
    </div>

    <Dialog
      :open="Boolean(selected)"
      @update:open="(value) => { if (!value) openId = null }"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ selected?.question }}</DialogTitle>
        </DialogHeader>
        <!-- eslint-disable-next-line vue/no-v-html -- HTML is module-sanitized with a scheme allowlist -->
        <div
          v-if="selectedBody.kind === 'html'"
          class="support-chat-html text-sm text-muted-foreground"
          v-html="selectedBody.html"
        />
        <p
          v-else
          class="whitespace-pre-wrap text-sm text-muted-foreground"
        >
          {{ selectedBody.text }}
        </p>
      </DialogContent>
    </Dialog>
  </div>
</template>
