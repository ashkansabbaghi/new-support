<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { usePredeterminedList } from '@/application'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { predeterminedCategories } from '@/domain'

const props = defineProps<{
  open: boolean
  sending?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  send: [text: string]
}>()

const { t } = useI18n()
const listQuery = usePredeterminedList({})

const category = ref('')
const answerId = ref('')
const preview = ref('')

const answers = computed(() => listQuery.data.value ?? [])
const categories = computed(() => predeterminedCategories(answers.value))
const inCategory = computed(() =>
  category.value ? answers.value.filter((item) => item.category === category.value) : answers.value,
)

watch(category, () => {
  answerId.value = ''
  preview.value = ''
})

watch(answerId, (id) => {
  preview.value = answers.value.find((item) => item.id === id)?.content ?? ''
})

function submit(): void {
  const text = preview.value.trim()
  if (!text || props.sending) {
    return
  }
  emit('send', text)
  emit('update:open', false)
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent class="max-h-[min(90dvh,40rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ t('staff.predetermined.title') }}</DialogTitle>
      </DialogHeader>

      <p
        v-if="answers.length === 0"
        class="text-sm text-muted-foreground"
      >
        {{ t('staff.predetermined.empty') }}
      </p>

      <div
        v-else
        class="space-y-3"
      >
        <Select v-model="category">
          <SelectTrigger
            class="w-full"
            :aria-label="t('staff.predetermined.category')"
          >
            <SelectValue :placeholder="t('staff.predetermined.category')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="item in categories"
              :key="item"
              :value="item"
            >
              {{ item }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          v-model="answerId"
          :disabled="!category && categories.length > 0"
        >
          <SelectTrigger
            class="w-full"
            :aria-label="t('staff.predetermined.answer')"
          >
            <SelectValue :placeholder="t('staff.predetermined.answer')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="item in inCategory"
              :key="item.id"
              :value="item.id"
            >
              {{ item.title }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Textarea
          v-model="preview"
          :placeholder="t('staff.predetermined.preview')"
          rows="5"
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          class="w-full shadow-support-primary"
          :disabled="!preview.trim() || sending"
          @click="submit"
        >
          {{ t('staff.predetermined.send') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
