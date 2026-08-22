<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { ClosedConversationError, useConveyConversationMutation, useStaffList } from '@/application'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { Conversation, Department } from '@/domain'
import { toStaffMemberList } from '@/domain'

const props = defineProps<{
  conversation: Conversation | null
  departments: Department[]
  open: boolean
  mode: 'staff' | 'department'
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  conveyed: []
}>()

const { t } = useI18n()
const staffQuery = useStaffList()
const conveyMutation = useConveyConversationMutation()

const selectedStaff = ref('')
const selectedDepartment = ref('')
const forceAssigning = ref(false)
const errorMessage = ref('')

const staffMembers = computed(() => toStaffMemberList(staffQuery.data.value))
const closed = computed(() => props.conversation?.status === 'closed')
const title = computed(() =>
  props.mode === 'staff' ? t('staff.convey.changeStaff') : t('staff.convey.changeDepartment'),
)

function close(): void {
  emit('update:open', false)
}

async function submit(): Promise<void> {
  const conversation = props.conversation
  if (!conversation || closed.value) {
    errorMessage.value = t('staff.convey.refused')
    return
  }
  const data =
    props.mode === 'staff'
      ? {
          staff: selectedStaff.value,
          forceAssigning: forceAssigning.value,
        }
      : { department: selectedDepartment.value }
  if (props.mode === 'staff' && !selectedStaff.value) {
    return
  }
  if (props.mode === 'department' && !selectedDepartment.value) {
    return
  }
  errorMessage.value = ''
  try {
    await conveyMutation.mutateAsync({ conversationId: conversation.id, data })
    emit('conveyed')
    close()
  } catch (error) {
    errorMessage.value =
      error instanceof ClosedConversationError ? t('staff.convey.refused') : t('widget.loadError')
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent class="max-h-[min(90dvh,36rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>
          {{ conversation?.title || t('staff.convey.title') }}
        </DialogDescription>
      </DialogHeader>

      <p
        v-if="closed"
        class="text-sm text-destructive"
      >
        {{ t('staff.convey.closed') }}
      </p>

      <div
        v-else-if="mode === 'staff'"
        class="space-y-3"
      >
        <Select v-model="selectedStaff">
          <SelectTrigger
            class="w-full"
            :aria-label="t('staff.convey.staff')"
          >
            <SelectValue :placeholder="t('staff.convey.staff')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="member in staffMembers"
              :key="member.id"
              :value="member.id"
            >
              {{ member.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="forceAssigning"
            type="checkbox"
            class="size-4 accent-primary"
          >
          {{ t('staff.convey.force') }}
        </label>
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <Select v-model="selectedDepartment">
          <SelectTrigger
            class="w-full"
            :aria-label="t('staff.convey.department')"
          >
            <SelectValue :placeholder="t('staff.convey.department')" />
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

      <p
        v-if="errorMessage"
        class="text-sm text-destructive"
      >
        {{ errorMessage }}
      </p>

      <DialogFooter class="flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          class="w-full sm:w-auto"
          @click="close"
        >
          {{ t('staff.convey.cancel') }}
        </Button>
        <Button
          type="button"
          class="w-full shadow-support-primary sm:w-auto"
          :disabled="closed || conveyMutation.isPending"
          @click="submit"
        >
          {{ t('staff.convey.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
