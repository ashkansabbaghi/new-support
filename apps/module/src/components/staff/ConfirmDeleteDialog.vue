<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

defineProps<{
  open: boolean
  title?: string
  busy?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

const { t } = useI18n()
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent class="max-w-[calc(100%-2rem)] sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title || t('staff.admin.confirmDelete') }}</DialogTitle>
        <DialogDescription>
          {{ t('staff.admin.confirmDelete') }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          class="w-full sm:w-auto"
          :disabled="busy"
          @click="emit('update:open', false)"
        >
          {{ t('staff.admin.cancel') }}
        </Button>
        <Button
          type="button"
          variant="destructive"
          class="w-full sm:w-auto"
          :disabled="busy"
          @click="emit('confirm')"
        >
          {{ t('staff.admin.delete') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
