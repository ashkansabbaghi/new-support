<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  useCreatePredeterminedMutation,
  useDeletePredeterminedMutation,
  usePredeterminedCategories,
  usePredeterminedCount,
  usePredeterminedList,
  useUpdatePredeterminedMutation,
} from '@/application'
import ConfirmDeleteDialog from '@/components/staff/ConfirmDeleteDialog.vue'
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
import { predeterminedCategories, type PredeterminedAnswer } from '@/domain'

const PAGE_SIZE = 10
const NEW_CATEGORY = '__new__'
const { t } = useI18n()
const { managePredetermined } = useStaffActor()

const page = ref(1)
const formOpen = ref(false)
const deleteOpen = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<PredeterminedAnswer | null>(null)
const errorMessage = ref('')
const categoryChoice = ref('')
const form = reactive({
  category: '',
  title: '',
  content: '',
})

const listInput = computed(() => ({
  startRow: (page.value - 1) * PAGE_SIZE,
  rowsPerPage: PAGE_SIZE,
}))
const listQuery = usePredeterminedList(listInput)
const countQuery = usePredeterminedCount()
const categoriesQuery = usePredeterminedCategories()
const createMutation = useCreatePredeterminedMutation()
const updateMutation = useUpdatePredeterminedMutation()
const deleteMutation = useDeletePredeterminedMutation()

const items = computed(() => listQuery.data.value ?? [])
const total = computed(() => countQuery.data.value ?? 0)
const categories = computed(() => {
  const fromApi = categoriesQuery.data.value ?? []
  return [...new Set([...fromApi, ...predeterminedCategories(items.value)])]
})
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const busy = computed(
  () => createMutation.isPending.value || updateMutation.isPending.value || deleteMutation.isPending.value,
)
const deleting = computed(() => deleteMutation.isPending.value)

function resetForm(): void {
  editingId.value = null
  form.category = ''
  form.title = ''
  form.content = ''
  categoryChoice.value = ''
  errorMessage.value = ''
}

function openCreate(): void {
  resetForm()
  formOpen.value = true
}

function openEdit(item: PredeterminedAnswer): void {
  editingId.value = item.id
  form.category = item.category
  form.title = item.title
  form.content = item.content
  categoryChoice.value = item.category
  errorMessage.value = ''
  formOpen.value = true
}

function askDelete(item: PredeterminedAnswer): void {
  deleteTarget.value = item
  deleteOpen.value = true
}

function onCategoryChoice(value: unknown): void {
  const next = typeof value === 'string' ? value : ''
  categoryChoice.value = next
  if (next !== NEW_CATEGORY) {
    form.category = next
  } else {
    form.category = ''
  }
}

async function save(): Promise<void> {
  if (!form.category.trim() || !form.title.trim() || !form.content.trim()) {
    errorMessage.value = t('staff.admin.required')
    return
  }
  errorMessage.value = ''
  const payload = {
    category: form.category.trim(),
    title: form.title.trim(),
    content: form.content.trim(),
    ...(editingId.value ? { id: editingId.value } : {}),
  }
  try {
    if (editingId.value) {
      await updateMutation.mutateAsync(payload)
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
    if (page.value > 1 && items.value.length <= 1) {
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
      v-if="!managePredetermined"
      class="text-sm text-muted-foreground"
    >
      {{ t('staff.noAccess') }}
    </p>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 class="text-base font-semibold">
            {{ t('staff.admin.predetermined') }}
          </h1>
          <p class="text-xs text-muted-foreground">
            {{ t('staff.admin.predeterminedHint') }}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          class="shadow-support-primary"
          @click="openCreate"
        >
          {{ t('staff.admin.add') }}
        </Button>
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
          <p class="text-xs text-muted-foreground">
            {{ item.category }}
          </p>
          <p class="font-medium">
            {{ item.title }}
          </p>
          <p class="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {{ item.content }}
          </p>
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
        v-if="total > PAGE_SIZE"
        class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
      >
        <span>{{ t('staff.pagination', { from: (page - 1) * PAGE_SIZE + 1, to: (page - 1) * PAGE_SIZE + items.length, total }) }}</span>
        <div class="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            :disabled="page <= 1"
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
      <DialogContent class="max-h-[min(90dvh,40rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ editingId ? t('staff.admin.editPredetermined') : t('staff.admin.addPredetermined') }}
          </DialogTitle>
        </DialogHeader>
        <form
          class="space-y-3"
          @submit.prevent="save"
        >
          <div class="space-y-1.5">
            <span class="text-sm font-medium">{{ t('staff.admin.category') }}</span>
            <Select
              :model-value="categoryChoice"
              @update:model-value="onCategoryChoice"
            >
              <SelectTrigger
                class="w-full"
                :aria-label="t('staff.admin.category')"
              >
                <SelectValue :placeholder="t('staff.admin.category')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in categories"
                  :key="item"
                  :value="item"
                >
                  {{ item }}
                </SelectItem>
                <SelectItem :value="NEW_CATEGORY">
                  {{ t('staff.admin.newCategory') }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              v-if="categoryChoice === NEW_CATEGORY || categories.length === 0"
              v-model="form.category"
              :placeholder="t('staff.admin.newCategory')"
            />
          </div>
          <div class="space-y-1.5">
            <label
              class="text-sm font-medium"
              for="admin-pre-title"
            >{{ t('staff.admin.title') }}</label>
            <Input
              id="admin-pre-title"
              v-model="form.title"
            />
          </div>
          <div class="space-y-1.5">
            <label
              class="text-sm font-medium"
              for="admin-pre-content"
            >{{ t('staff.admin.content') }}</label>
            <Textarea
              id="admin-pre-content"
              v-model="form.content"
              rows="5"
            />
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
      :title="deleteTarget?.title"
      :busy="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
