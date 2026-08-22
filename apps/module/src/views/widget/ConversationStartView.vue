<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { useFaqs } from '@/application'
import FaqList from '@/components/widget/FaqList.vue'
import StartConversationForm from '@/components/widget/StartConversationForm.vue'
import { useOpenFlow } from '@/composables/useOpenFlow'
import { toFaqList } from '@/domain'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()
const { open, isPending } = useOpenFlow()

const step = ref<'form' | 'faq'>('form')
const opening = ref(false)

watch(
  () => route.name,
  () => {
    step.value = 'form'
    opening.value = false
  },
)

const faqQuery = useFaqs(
  computed(() =>
    ui.startDepartmentId ? { department: ui.startDepartmentId, page: 0 } : undefined,
  ),
)

watch(
  () => faqQuery.data.value,
  (value) => {
    if (step.value !== 'faq' || opening.value) {
      return
    }
    if (toFaqList(value).length === 0 && !faqQuery.isPending.value && ui.startDepartmentId) {
      void startChat()
    }
  },
)

async function onFormSubmit(payload: { title: string; departmentId: string }): Promise<void> {
  ui.setStartDraft(payload.title, payload.departmentId)
  step.value = 'faq'
}

async function startChat(): Promise<void> {
  if (!ui.startTitle || !ui.startDepartmentId || opening.value) {
    return
  }
  opening.value = true
  try {
    await open({ title: ui.startTitle, department: ui.startDepartmentId })
  } finally {
    opening.value = false
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col p-4">
    <StartConversationForm
      v-if="step === 'form'"
      @submit="onFormSubmit"
    />
    <FaqList
      v-else
      :department-id="ui.startDepartmentId"
      @start="startChat"
      @back="step = 'form'"
    />
    <p
      v-if="isPending || opening || faqQuery.isPending"
      class="pt-3 text-center text-xs text-muted-foreground"
    >
      {{ t('widget.waitingConnect') }}
    </p>
  </div>
</template>
