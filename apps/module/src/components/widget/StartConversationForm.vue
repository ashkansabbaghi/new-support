<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDepartments } from '@/application'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toDepartmentList } from '@/domain'
import { useUiStore } from '@/stores/ui'

const emit = defineEmits<{
  submit: [payload: { title: string; departmentId: string }]
}>()

const { t } = useI18n()
const ui = useUiStore()
const departmentsQuery = useDepartments()

const title = ref(ui.startTitle)
const departmentId = ref(ui.startDepartmentId)
const submitted = ref(false)

const departments = computed(() => toDepartmentList(departmentsQuery.data.value))

const titleError = computed(() => {
  if (!submitted.value) {
    return ''
  }
  if (title.value.trim().length < 10) {
    return t('chat.start.error.limit-min', { limit: 10 })
  }
  if (title.value.trim().length > 50) {
    return t('chat.start.error.limit-max', { limit: 50 })
  }
  return ''
})

const departmentError = computed(() => {
  if (!submitted.value) {
    return ''
  }
  return departmentId.value ? '' : t('chat.start.select-department')
})

watch([title, departmentId], () => {
  ui.setStartDraft(title.value, departmentId.value)
})

function onSubmit(): void {
  submitted.value = true
  if (titleError.value || departmentError.value) {
    return
  }
  emit('submit', { title: title.value.trim(), departmentId: departmentId.value })
}
</script>

<template>
  <form
    class="flex flex-col gap-4"
    @submit.prevent="onSubmit"
  >
    <p class="text-center text-sm text-muted-foreground">
      <b class="block text-foreground">{{ t('chat.start.greeting', { name: t('chat.global.dearUser') }) }}</b>
      {{ t('chat.start.title') }}
    </p>

    <div class="space-y-1.5">
      <label
        class="text-sm font-medium"
        for="support-start-title"
      >{{ t('chat.start.issue') }}</label>
      <Input
        id="support-start-title"
        v-model="title"
        :placeholder="t('chat.start.sample')"
        :aria-invalid="Boolean(titleError)"
      />
      <p
        v-if="titleError"
        class="text-xs text-destructive"
      >
        {{ titleError }}
      </p>
    </div>

    <div class="space-y-1.5">
      <span class="text-sm font-medium">{{ t('chat.start.department') }}</span>
      <Select v-model="departmentId">
        <SelectTrigger
          class="w-full"
          :aria-invalid="Boolean(departmentError)"
          :aria-label="t('chat.start.select-department')"
        >
          <SelectValue :placeholder="t('chat.start.select-department')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="department in departments"
            :key="department.id"
            :value="department.id"
          >
            {{ department.name }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p
        v-if="departmentError"
        class="text-xs text-destructive"
      >
        {{ departmentError }}
      </p>
      <p
        v-if="departmentsQuery.isError"
        class="text-xs text-muted-foreground"
      >
        {{ t('chat.start.not-found') }}
      </p>
    </div>

    <Button
      type="submit"
      class="w-full shadow-support-primary"
      :disabled="departmentsQuery.isPending"
    >
      {{ t('chat.start.start-chat') }}
    </Button>
  </form>
</template>
