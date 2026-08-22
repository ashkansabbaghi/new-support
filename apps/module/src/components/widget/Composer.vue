<script setup lang="ts">
import { Paperclip, Send } from '@lucide/vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FILE_ERROR_HEIC, FILE_ERROR_SIZE_LIMIT, FILE_ERROR_WRONG_TYPE, fileErrorCode } from '@/domain'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    sending?: boolean
  }>(),
  {
    disabled: false,
    sending: false,
  },
)

const emit = defineEmits<{
  send: [text: string]
  attach: [file: File]
}>()

const { t } = useI18n()
const text = ref('')
const fileError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function fileErrorMessage(code: string | undefined): string {
  if (code === FILE_ERROR_WRONG_TYPE) {
    return t('widget.file.wrongType')
  }
  if (code === FILE_ERROR_SIZE_LIMIT) {
    return t('widget.file.tooLarge')
  }
  if (code === FILE_ERROR_HEIC) {
    return t('widget.file.heic')
  }
  return t('widget.file.failed')
}

function submit(): void {
  const value = text.value.trim()
  if (!value || props.disabled || props.sending) {
    return
  }
  fileError.value = ''
  emit('send', value)
  text.value = ''
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}

function openPicker(): void {
  if (props.disabled || props.sending) {
    return
  }
  fileInput.value?.click()
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  fileError.value = ''
  emit('attach', file)
}

function showFileError(error: unknown): void {
  fileError.value = fileErrorMessage(fileErrorCode(error))
}

defineExpose({ showFileError })
</script>

<template>
  <form
    class="flex min-h-[var(--support-size-composer)] flex-col border-t border-border bg-card px-3 py-2"
    @submit.prevent="submit"
  >
    <div class="flex items-end gap-2">
      <input
        ref="fileInput"
        type="file"
        class="sr-only"
        accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif"
        :disabled="disabled || sending"
        @change="onFileChange"
      >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        class="mb-1"
        :disabled="disabled || sending"
        :aria-label="t('chat.conversation.attach')"
        @click="openPicker"
      >
        <Paperclip class="size-4" />
      </Button>
      <Button
        type="submit"
        size="icon"
        class="mb-1 shadow-support-primary"
        :disabled="disabled || sending || !text.trim()"
        :aria-label="t('chat.start.start-chat')"
      >
        <Send class="size-4" />
      </Button>
      <Textarea
        v-model="text"
        class="min-h-10 flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
        :placeholder="t('chat.conversation.write-message')"
        :disabled="disabled"
        rows="1"
        @keydown="onKeydown"
      />
    </div>
    <p
      v-if="fileError"
      class="pt-1 text-[11px] text-destructive"
    >
      {{ fileError }}
    </p>
  </form>
</template>
