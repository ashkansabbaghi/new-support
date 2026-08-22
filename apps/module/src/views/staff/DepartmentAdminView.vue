<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  useAdminDepartments,
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
  useDepartmentCount,
  useUpdateDepartmentMutation,
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
import { Textarea } from '@/components/ui/textarea'
import { useStaffActor } from '@/composables/useStaffActor'
import type { Department } from '@/domain'

const PAGE_SIZE = 10
const { t } = useI18n()
const { manageDepartments } = useStaffActor()

const page = ref(0)
const formOpen = ref(false)
const deleteOpen = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<Department | null>(null)
const errorMessage = ref('')
const form = reactive({
  name: '',
  description: '',
  icon: '',
})

const pageInput = computed(() => ({ page: page.value, rowsPerPage: PAGE_SIZE }))
const listQuery = useAdminDepartments(pageInput)
const countQuery = useDepartmentCount()
const createMutation = useCreateDepartmentMutation()
const updateMutation = useUpdateDepartmentMutation()
const deleteMutation = useDeleteDepartmentMutation()

const items = computed(() => listQuery.data.value ?? [])
const total = computed(() => countQuery.data.value ?? 0)
const maxPage = computed(() => Math.max(0, Math.ceil(total.value / PAGE_SIZE) - 1))
const busy = computed(
  () => createMutation.isPending.value || updateMutation.isPending.value || deleteMutation.isPending.value,
)
const deleting = computed(() => deleteMutation.isPending.value)

function resetForm(): void {
  editingId.value = null
  form.name = ''
  form.description = ''
  form.icon = ''
  errorMessage.value = ''
}

function openCreate(): void {
  resetForm()
  formOpen.value = true
}

function openEdit(item: Department): void {
  editingId.value = item.id
  form.name = item.name
  form.description = item.description ?? ''
  form.icon = item.icon ?? ''
  errorMessage.value = ''
  formOpen.value = true
}

function askDelete(item: Department): void {
  deleteTarget.value = item
  deleteOpen.value = true
}

async function save(): Promise<void> {
  const name = form.name.trim()
  if (!name) {
    errorMessage.value = t('staff.admin.required')
    return
  }
  errorMessage.value = ''
  const payload = {
    name,
    ...(form.description.trim() ? { description: form.description.trim() } : {}),
    ...(form.icon.trim() ? { icon: form.icon.trim() } : {}),
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
      v-if="!manageDepartments"
      class="text-sm text-muted-foreground"
    >
      {{ t('staff.noAccess') }}
    </p>

    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 class="text-base font-semibold">
            {{ t('staff.admin.departments') }}
          </h1>
          <p class="text-xs text-muted-foreground">
            {{ t('staff.admin.departmentHint') }}
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
          <p class="font-medium">
            {{ item.name }}
          </p>
          <p
            v-if="item.description"
            class="mt-1 text-sm text-muted-foreground"
          >
            {{ item.description }}
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
        <span>{{ t('staff.pagination', { from: page * PAGE_SIZE + 1, to: page * PAGE_SIZE + items.length, total }) }}</span>
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
      <DialogContent class="max-h-[min(90dvh,40rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ editingId ? t('staff.admin.editDepartment') : t('staff.admin.addDepartment') }}
          </DialogTitle>
        </DialogHeader>
        <form
          class="space-y-3"
          @submit.prevent="save"
        >
          <div class="space-y-1.5">
            <label
              class="text-sm font-medium"
              for="admin-dept-name"
            >{{ t('staff.admin.name') }}</label>
            <Input
              id="admin-dept-name"
              v-model="form.name"
              :placeholder="t('staff.admin.name')"
            />
          </div>
          <div class="space-y-1.5">
            <label
              class="text-sm font-medium"
              for="admin-dept-description"
            >{{ t('staff.admin.description') }}</label>
            <Textarea
              id="admin-dept-description"
              v-model="form.description"
              rows="4"
              :placeholder="t('staff.admin.description')"
            />
          </div>
          <div class="space-y-1.5">
            <label
              class="text-sm font-medium"
              for="admin-dept-icon"
            >{{ t('staff.admin.icon') }}</label>
            <Input
              id="admin-dept-icon"
              v-model="form.icon"
              :placeholder="t('staff.admin.icon')"
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
      :title="deleteTarget?.name"
      :busy="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
