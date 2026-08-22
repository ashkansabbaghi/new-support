<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const props = withDefaults(
  defineProps<{
    title?: string
    departmentName?: string
    sending?: boolean
  }>(),
  {
    title: '',
    departmentName: '',
    sending: false,
  },
)

const emit = defineEmits<{
  send: [text: string]
}>()

const { t } = useI18n()
const message = ref('')
const submitted = ref(false)

const error = computed(() => {
  if (!submitted.value) {
    return ''
  }
  if (!message.value.trim()) {
    return t('widget.firstMessage.required')
  }
  if (message.value.trim().length > 320) {
    return t('chat.start.error.limit-max', { limit: 320 })
  }
  return ''
})

function submit(): void {
  submitted.value = true
  if (error.value || props.sending) {
    return
  }
  emit('send', message.value.trim())
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <div class="text-center text-sm">
      <p class="font-medium">
        {{ t('chat.start.issue') }}
      </p>
      <p class="text-base font-semibold">
        {{ title }}
      </p>
      <p class="mt-2 text-muted-foreground">
        {{ t('chat.start.department') }}
      </p>
      <p>{{ departmentName }}</p>
    </div>
    <p class="text-sm text-muted-foreground">
      {{ t('widget.firstMessage.body') }}
    </p>
    <Textarea
      v-model="message"
      :placeholder="t('widget.firstMessage.placeholder')"
      :aria-invalid="Boolean(error)"
    />
    <p
      v-if="error"
      class="text-xs text-destructive"
    >
      {{ error }}
    </p>
    <Button
      type="button"
      class="w-full shadow-support-primary"
      :disabled="sending"
      @click="submit"
    >
      {{ t('widget.firstMessage.submit') }}
    </Button>
  </div>
</template>
