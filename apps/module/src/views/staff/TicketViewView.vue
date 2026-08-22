<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import {
  reportConversationState,
  useCloseConversationMutation,
  useDepartments,
  useProcessConversationMutation,
} from '@/application'
import ConveyDialog from '@/components/staff/ConveyDialog.vue'
import PredeterminedPicker from '@/components/staff/PredeterminedPicker.vue'
import TicketProfile from '@/components/staff/TicketProfile.vue'
import { Button } from '@/components/ui/button'
import Composer from '@/components/widget/Composer.vue'
import MessageList from '@/components/widget/MessageList.vue'
import StatusBadge from '@/components/widget/StatusBadge.vue'
import { useStaffActor } from '@/composables/useStaffActor'
import { useThreadMessages } from '@/composables/useThreadMessages'
import { useWidgetNavigation } from '@/composables/useWidgetNavigation'
import { toDepartmentList } from '@/domain'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()
const { go } = useWidgetNavigation()
const { staffId } = useStaffActor()

const conversationId = computed(() => {
  const raw = route.params.conversationId
  return Array.isArray(raw) ? raw[0] : raw
})

watch(
  conversationId,
  (id) => {
    if (id) {
      ui.setActiveConversationId(id)
    }
  },
  { immediate: true },
)

const thread = useThreadMessages(
  () => conversationId.value,
  { viewerId: () => staffId.value },
)
const items = thread.items
const messages = thread.messages
const userId = thread.userId
const sending = thread.sending
const messagesPending = thread.isPending
const conversation = computed(() => thread.conversation.data.value)
const closed = computed(() => conversation.value?.status === 'closed')
const departmentsQuery = useDepartments()
const departments = computed(() => toDepartmentList(departmentsQuery.data.value))
const closeMutation = useCloseConversationMutation()
const processMutation = useProcessConversationMutation()

const conveyOpen = ref(false)
const conveyMode = ref<'staff' | 'department'>('staff')
const predeterminedOpen = ref(false)
const composer = ref<{ showFileError: (error: unknown) => void } | null>(null)

async function attachFile(file: File): Promise<void> {
  try {
    await thread.sendFile(file)
  } catch (error) {
    composer.value?.showFileError(error)
  }
}

async function processChat(): Promise<void> {
  const id = conversationId.value
  if (!id || closed.value) {
    return
  }
  await processMutation.mutateAsync(id)
  reportConversationState({ conversationId: id, state: 'processing' })
}

async function closeChat(): Promise<void> {
  const id = conversationId.value
  if (!id || closed.value) {
    return
  }
  await closeMutation.mutateAsync(id)
  reportConversationState({ conversationId: id, state: 'closed' })
}

function openConvey(mode: 'staff' | 'department'): void {
  if (closed.value || !conversation.value) {
    return
  }
  conveyMode.value = mode
  conveyOpen.value = true
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row lg:p-4">
    <section class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-support border border-border bg-card">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div class="min-w-0">
          <p class="truncate text-sm font-medium">
            {{ conversation?.title || t('chat.global.support-title') }}
          </p>
          <p class="font-mono text-[11px] text-muted-foreground">
            {{ conversation?.chatID || conversationId }}
          </p>
        </div>
        <StatusBadge :status="conversation?.status" />
      </div>

      <p
        v-if="thread.conversation.isError"
        class="px-3 py-2 text-xs text-destructive"
      >
        {{ t('widget.loadError') }}
      </p>

      <MessageList
        :items="items"
        :user-id="userId"
        :empty="!messagesPending && messages.length === 0"
        @visible="thread.markVisibleSeen()"
      />

      <div class="flex flex-wrap gap-2 border-t border-border px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          :disabled="closed || processMutation.isPending"
          @click="processChat"
        >
          {{ t('staff.process') }}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          :disabled="closed || closeMutation.isPending"
          @click="closeChat"
        >
          {{ t('staff.close') }}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          :disabled="closed"
          @click="openConvey('staff')"
        >
          {{ t('staff.convey.changeStaff') }}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          :disabled="closed"
          @click="openConvey('department')"
        >
          {{ t('staff.convey.changeDepartment') }}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          :disabled="closed"
          @click="predeterminedOpen = true"
        >
          {{ t('staff.predetermined.title') }}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          class="lg:hidden"
          @click="go({ name: 'ticket.list' })"
        >
          {{ t('staff.backToList') }}
        </Button>
      </div>

      <Composer
        ref="composer"
        :disabled="closed"
        :sending="sending"
        @send="thread.sendText"
        @attach="attachFile"
      />
    </section>

    <div class="w-full shrink-0 lg:w-72">
      <TicketProfile
        v-if="conversation"
        :conversation="conversation"
      />
    </div>

    <ConveyDialog
      v-model:open="conveyOpen"
      :conversation="conversation ?? null"
      :departments="departments"
      :mode="conveyMode"
    />
    <PredeterminedPicker
      v-model:open="predeterminedOpen"
      :sending="sending"
      @send="thread.sendText"
    />
  </div>
</template>
