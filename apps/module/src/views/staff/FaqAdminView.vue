<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  useAdminFaqs,
  useCreateFaqMutation,
  useDeleteFaqMutation,
  useDepartments,
  useFaqCount,
  useFaqTags,
  useUpdateFaqMutation,
} from '@/application'
import ConfirmDeleteDialog from '@/components/staff/ConfirmDeleteDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useStaffActor } from '@/composables/useStaffActor'
import { toDepartmentList, type FaqItem } from '@/domain'

const ALL = '__all__'
const { t } = useI18n()
const { manageFaqs } = useStaffActor()

const page = ref(0)
const departmentFilter = ref('')
const formOpen = ref(false)
const deleteOpen = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<FaqItem | null>(null)
const tagDraft = ref('')
const errorMessage = ref('')
const form = reactive({
  question: '',
  excerpt: '',
  answer: '',
  department: '',
  tags: [] as string[],
})

const listInput = computed(() => ({
  page: page.value,
  ...(departmentFilter.value ? { department: departmentFilter.value } : {}),
}))
const listQuery = useAdminFaqs(listInput)
const countQuery = useFaqCount(computed(() => departmentFilter.value || undefined))
const departmentsQuery = useDepartments()
const tagsQuery = useFaqTags()

const createMutation = useCreateFaqMutation()
const updateMutation = useUpdateFaqMutation()
const deleteMutation = useDeleteFaqMutation()

const items = computed(() => listQuery.data.value ?? [])
const total = computed(() => countQuery.data.value ?? 0)
const departments = computed(() => toDepartmentList(departmentsQuery.data.value))
const knownTags = computed(() => tagsQuery.data.value ?? [])
const maxPage = computed(() => Math.max(0, Math.ceil(total.value / 10) - 1))
const busy = computed(
  () => createMutation.isPending.value || updateMutation.isPending.value || deleteMutation.isPending.value,
)
const deleting = computed(() => deleteMutation.isPending.value)

function departmentName(id?: string): string {
  return departments.value.find((item) => item.id === id)?.name || id || '—'
}

function resetForm(): void {
  editingId.value = null
  form.question = ''
  form.excerpt = ''
  form.answer = ''
  form.department = departmentFilter.value
  form.tags = []
  tagDraft.value = ''
  errorMessage.value = ''
}

function openCreate(): void {
  resetForm()
  formOpen.value = true
}

function openEdit(item: FaqItem): void {
  editingId.value = item.id
  form.question = item.question
  form.excerpt = item.excerpt
  form.answer = item.answer
  form.department = item.departmentId ?? ''
  form.tags = [...item.tags]
  errorMessage.value = ''
  formOpen.value = true
}

function askDelete(item: FaqItem): void {
  deleteTarget.value = item
  deleteOpen.value = true
}

function addTag(value?: string): void {
  const tag = (value ?? tagDraft.value).trim()
  if (!tag || form.tags.includes(tag)) {
    tagDraft.value = ''
    return
  }
  form.tags.push(tag)
  tagDraft.value = ''
}

function removeTag(tag: string): void {
  form.tags = form.tags.filter((item) => item !== tag)
}

function onDepartmentFilter(value: unknown): void {
  departmentFilter.value = value === ALL || typeof value !== 'string' ? '' : value
  page.value = 0
}

async function save(): Promise<void> {
  if (!form.question.trim() || !form.answer.trim() || !form.department) {
    errorMessage.value = t('staff.admin.required')
    return
  }
  errorMessage.value = ''
  const payload = {
    question: form.question.trim(),
    excerpt: form.excerpt.trim(),
    answer: form.answer.trim(),
    department: form.department,
    tags: form.tags,
  }
  try {
    if (editingId.value) {
      await updateMutation.mutateAsync({ id: editingId.value, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    formOpen.value = false
    resetForm()
  } catch {
    errorMessage.value = t('staff.admin.saveError')
  }
}

async function confirmDelete(): Promise<void> {
  const id = deleteTarget.value?.id
  if (!id) {
    return
  }
  try {
    await deleteMutation.mutateAsync(id)
    deleteOpen.value = false
    deleteTarget.value = null
    if (page.value > 0 && items.value.length <= 1) {
      page.value -= 1
    }
  } catch {
    errorMessage.value = t('staff.admin.deleteError')
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
    <p
      v-if="!manageFaqs"
      class="text-sm text-muted-foreground"
    >
      {{ t('staff.noAccess') }}
    </p>

    <template v-else>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-base font-semibold">
            {{ t('staff.admin.faqs') }}
          </h1>
          <p class="text-xs text-muted-foreground">
            {{ t('staff.admin.faqHint') }}
          </p>
        </div>
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Select
            :model-value="departmentFilter || ALL"
            @update:model-value="onDepartmentFilter"
          >
            <SelectTrigger
              class="w-full sm:w-56"
              :aria-label="t('staff.admin.department')"
            >
              <SelectValue :placeholder="t('staff.admin.department')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL">
                {{ t('staff.filters.all') }}
              </SelectItem>
              <SelectItem
                v-for="department in departments"
                :key="department.id"
                :value="department.id"
              >
                {{ department.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            class="shadow-support-primary"
            @click="openCreate"
          >
            {{ t('staff.admin.add') }}
          </Button>
        </div>
      </div>

      <p
        v-if="listQuery.isError || countQuery.isError"
        class="text-sm text-destructive"
      >
        {{ t('staff.admin.loadError') }}
      </p>

      <ul
        v-if="items.length > 0"
        class="space-y-2"
      >
        <li
          v-for="item in items"
          :key="item.id"
          class="rounded-support border border-border bg-support-surface-muted p-3"
        >
          <p class="font-medium">
            {{ item.question }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ departmentName(item.departmentId) }}
          </p>
          <p
            v-if="item.excerpt"
            class="mt-2 text-sm text-muted-foreground"
          >
            {{ item.excerpt }}
          </p>
          <div
            v-if="item.tags.length > 0"
            class="mt-2 flex flex-wrap gap-1"
          >
            <Badge
              v-for="tag in item.tags"
              :key="tag"
              variant="secondary"
            >
              {{ tag }}
            </Badge>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              @click="openEdit(item)"
            >
              {{ t('staff.admin.edit') }}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              @click="askDelete(item)"
            >
              {{ t('staff.admin.delete') }}
            </Button>
          </div>
        </li>
      </ul>

      <p
        v-else-if="!listQuery.isPending"
        class="py-8 text-center text-sm text-muted-foreground"
      >
        {{ t('staff.admin.empty') }}
      </p>

      <div
        v-if="total > 10"
        class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
      >
        <span>{{ t('staff.pagination', { from: page * 10 + 1, to: page * 10 + items.length, total }) }}</span>
        <div class="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            :disabled="page <= 0"
            @click="page -= 1"
          >
            {{ t('staff.prev') }}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            :disabled="page >= maxPage"
            @click="page += 1"
          >
            {{ t('staff.next') }}
          </Button>
        </div>
      </div>
    </template>

    <Dialog
      :open="formOpen"
      @update:open="formOpen = $event"
    >
      <DialogContent class="max-h-[min(90dvh,44rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ editingId ? t('staff.admin.editFaq') : t('staff.admin.addFaq') }}
          </DialogTitle>
        </DialogHeader>
        <form
          class="space-y-3"
          @submit.prevent="save"
        >
          <div class="space-y-1.5">
            <span class="text-sm font-medium">{{ t('staff.admin.department') }}</span>
            <Select v-model="form.department">
              <SelectTrigger
                class="w-full"
                :aria-label="t('staff.admin.department')"
              >
                <SelectValue :placeholder="t('staff.admin.department')" />
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
          </div>
          <div class="space-y-1.5">
            <label
              class="text-sm font-medium"
              for="admin-faq-question"
            >{{ t('staff.admin.question') }}</label>
            <Input
              id="admin-faq-question"
              v-model="form.question"
            />
          </div>
          <div class="space-y-1.5">
            <label
              class="text-sm font-medium"
              for="admin-faq-excerpt"
            >{{ t('staff.admin.excerpt') }}</label>
            <Textarea
              id="admin-faq-excerpt"
              v-model="form.excerpt"
              rows="3"
            />
          </div>
          <div class="space-y-1.5">
            <label
              class="text-sm font-medium"
              for="admin-faq-answer"
            >{{ t('staff.admin.answer') }}</label>
            <Textarea
              id="admin-faq-answer"
              v-model="form.answer"
              rows="5"
            />
          </div>
          <div class="space-y-1.5">
            <span class="text-sm font-medium">{{ t('staff.admin.tags') }}</span>
            <div class="flex flex-wrap gap-1">
              <Badge
                v-for="tag in form.tags"
                :key="tag"
                variant="secondary"
                class="cursor-pointer"
                @click="removeTag(tag)"
              >
                {{ tag }} ×
              </Badge>
            </div>
            <div class="flex gap-2">
              <Input
                v-model="tagDraft"
                :placeholder="t('staff.admin.addTag')"
                @keydown.enter.prevent="addTag()"
              />
              <Button
                type="button"
                variant="outline"
                @click="addTag()"
              >
                {{ t('staff.admin.addTag') }}
              </Button>
            </div>
            <div
              v-if="knownTags.length > 0"
              class="flex flex-wrap gap-1"
            >
              <Button
                v-for="tag in knownTags"
                :key="tag"
                type="button"
                size="sm"
                variant="ghost"
                @click="addTag(tag)"
              >
                {{ tag }}
              </Button>
            </div>
          </div>
          <p
            v-if="errorMessage"
            class="text-xs text-destructive"
          >
            {{ errorMessage }}
          </p>
          <DialogFooter class="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              class="w-full sm:w-auto"
              @click="formOpen = false"
            >
              {{ t('staff.admin.cancel') }}
            </Button>
            <Button
              type="submit"
              class="w-full shadow-support-primary sm:w-auto"
              :disabled="busy"
            >
              {{ t('staff.admin.save') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmDeleteDialog
      v-model:open="deleteOpen"
      :title="deleteTarget?.question"
      :busy="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
