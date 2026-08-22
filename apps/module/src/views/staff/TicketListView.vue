<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChatListFilter, ConversationQuery } from '@nipoto/support-sdk'

import {
  useClosedConversations,
  useConversationCount,
  useConversationList,
  useDepartments,
  useOpenConversations,
  useQueuedConversations,
  useStaffList,
} from '@/application'
import ConveyDialog from '@/components/staff/ConveyDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ConversationList from '@/components/widget/ConversationList.vue'
import StatusBadge from '@/components/widget/StatusBadge.vue'
import { useAppearance } from '@/composables/useAppearance'
import { ticketStatusI18nKey, useStaffActor } from '@/composables/useStaffActor'
import { useWidgetNavigation } from '@/composables/useWidgetNavigation'
import {
  buildTicketListQuery,
  formatConversationDate,
  TICKET_STATUS_VALUES,
  ticketListQueryReady,
  toDepartmentList,
  toStaffMemberList,
  type Conversation,
  type TicketListFilterInput,
} from '@/domain'
import { useUiStore } from '@/stores/ui'

const ALL = '__all__'
const { t } = useI18n()
const appearance = useAppearance()
const { go } = useWidgetNavigation()
const ui = useUiStore()
const { actor, isManager } = useStaffActor()

const tab = ref('open')
const page = ref(1)
const rowsPerPage = ref(10)
const form = reactive<TicketListFilterInput>({
  title: '',
  status: '',
  staff: '',
  department: '',
  updatedAtFromJalali: '',
  updatedAtToJalali: '',
  sortBy: '-updatedAt',
})
const applied = reactive({ ...form })

const conveyOpen = ref(false)
const conveyMode = ref<'staff' | 'department'>('staff')
const conveyTarget = ref<Conversation | null>(null)

const listFilter = computed(() => ({
  startRow: 0,
  rowsPerPage: 40,
  filter: ui.staffListFilter,
}))
const queuedPage = computed(() => ({ startRow: 0, rowsPerPage: 40 }))

const openQuery = useOpenConversations(listFilter)
const closedQuery = useClosedConversations(listFilter)
const queuedQuery = useQueuedConversations(queuedPage)
const departmentsQuery = useDepartments()
const staffQuery = useStaffList()

const ticketQuery = computed<ConversationQuery>(() =>
  buildTicketListQuery(
    {
      ...applied,
      startRow: (page.value - 1) * rowsPerPage.value,
      rowsPerPage: rowsPerPage.value,
    },
    actor.value,
  ),
)
const ticketsEnabled = computed(() => ticketListQueryReady(actor.value))
const ticketsQuery = useConversationList(ticketQuery, ticketsEnabled)
const ticketsCountQuery = useConversationCount(ticketQuery, ticketsEnabled)

const departments = computed(() => toDepartmentList(departmentsQuery.data.value))
const staffMembers = computed(() => toStaffMemberList(staffQuery.data.value))
const tickets = computed(() => ticketsQuery.data.value ?? [])
const total = computed(() => ticketsCountQuery.data.value ?? 0)
const fromRow = computed(() => (tickets.value.length === 0 ? 0 : (page.value - 1) * rowsPerPage.value + 1))
const toRow = computed(() => (page.value - 1) * rowsPerPage.value + tickets.value.length)
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / rowsPerPage.value)))

const departmentName = (id?: string) => departments.value.find((item) => item.id === id)?.name || id || '—'
const staffName = (id?: string) => staffMembers.value.find((item) => item.id === id)?.name || id || '—'

async function openConversation(conversation: Conversation): Promise<void> {
  ui.setActiveConversationId(conversation.id)
  await go({ name: 'ticket.view', params: { conversationId: conversation.id } })
}

function applyFilters(): void {
  Object.assign(applied, form)
  page.value = 1
}

function clearFilters(): void {
  form.title = ''
  form.status = ''
  form.staff = ''
  form.department = ''
  form.updatedAtFromJalali = ''
  form.updatedAtToJalali = ''
  applyFilters()
}

function setFilter(next: ChatListFilter): void {
  ui.setStaffListFilter(next)
}

function openConvey(conversation: Conversation, mode: 'staff' | 'department'): void {
  if (conversation.status === 'closed') {
    return
  }
  conveyTarget.value = conversation
  conveyMode.value = mode
  conveyOpen.value = true
}

function asSelectString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function onStatus(value: unknown): void {
  const next = asSelectString(value)
  form.status = next === ALL ? '' : next
}

function onStaff(value: unknown): void {
  const next = asSelectString(value)
  form.staff = next === ALL ? '' : next
}

function onDepartment(value: unknown): void {
  const next = asSelectString(value)
  form.department = next === ALL ? '' : next
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
    <Tabs
      v-model="tab"
      class="flex min-h-0 flex-1 flex-col"
    >
      <TabsList class="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="open">
          {{ t('staff.open') }}
        </TabsTrigger>
        <TabsTrigger value="queued">
          {{ t('staff.queued') }}
        </TabsTrigger>
        <TabsTrigger value="closed">
          {{ t('staff.closed') }}
        </TabsTrigger>
        <TabsTrigger value="tickets">
          {{ t('staff.tickets') }}
        </TabsTrigger>
      </TabsList>

      <div
        v-if="isManager && (tab === 'open' || tab === 'closed')"
        class="mt-3 flex flex-wrap gap-2"
      >
        <Button
          type="button"
          size="sm"
          :variant="ui.staffListFilter === 'self' ? 'default' : 'outline'"
          @click="setFilter('self')"
        >
          {{ t('staff.filterSelf') }}
        </Button>
        <Button
          type="button"
          size="sm"
          :variant="ui.staffListFilter === 'other' ? 'default' : 'outline'"
          @click="setFilter('other')"
        >
          {{ t('staff.filterOther') }}
        </Button>
      </div>

      <TabsContent
        value="open"
        class="mt-3 flex min-h-0 flex-1 flex-col"
      >
        <ConversationList
          :conversations="openQuery.data.value ?? []"
          empty-key="chat.chatLists.chats.empty"
          @select="openConversation"
        />
      </TabsContent>
      <TabsContent
        value="queued"
        class="mt-3 flex min-h-0 flex-1 flex-col"
      >
        <ConversationList
          :conversations="queuedQuery.data.value ?? []"
          empty-key="chat.chatLists.queueChat.empty"
          @select="openConversation"
        />
      </TabsContent>
      <TabsContent
        value="closed"
        class="mt-3 flex min-h-0 flex-1 flex-col"
      >
        <ConversationList
          :conversations="closedQuery.data.value ?? []"
          empty-key="chat.chatLists.closeChat.empty"
          @select="openConversation"
        />
      </TabsContent>
      <TabsContent
        value="tickets"
        class="mt-3 flex min-h-0 flex-1 flex-col gap-3"
      >
        <form
          class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
          @submit.prevent="applyFilters"
        >
          <Input
            v-model="form.title"
            :placeholder="t('staff.filters.titlePlaceholder')"
            :aria-label="t('staff.filters.title')"
          />
          <Select
            :model-value="form.status || ALL"
            @update:model-value="onStatus"
          >
            <SelectTrigger :aria-label="t('staff.filters.status')">
              <SelectValue :placeholder="t('staff.filters.status')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL">
                {{ t('staff.filters.all') }}
              </SelectItem>
              <SelectItem
                v-for="status in TICKET_STATUS_VALUES"
                :key="status"
                :value="status"
              >
                {{ t(ticketStatusI18nKey(status)) }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            v-if="isManager"
            :model-value="form.staff || ALL"
            @update:model-value="onStaff"
          >
            <SelectTrigger :aria-label="t('staff.filters.staff')">
              <SelectValue :placeholder="t('staff.filters.staff')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL">
                {{ t('staff.filters.all') }}
              </SelectItem>
              <SelectItem
                v-for="member in staffMembers"
                :key="member.id"
                :value="member.id"
              >
                {{ member.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            :model-value="form.department || ALL"
            @update:model-value="onDepartment"
          >
            <SelectTrigger :aria-label="t('staff.filters.department')">
              <SelectValue :placeholder="t('staff.filters.department')" />
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
          <Input
            v-model="form.updatedAtFromJalali"
            :placeholder="`${t('staff.filters.from')} 1403/01/01`"
            :aria-label="t('staff.filters.from')"
          />
          <Input
            v-model="form.updatedAtToJalali"
            :placeholder="`${t('staff.filters.to')} 1403/12/29`"
            :aria-label="t('staff.filters.to')"
          />
          <Select v-model="form.sortBy">
            <SelectTrigger :aria-label="t('staff.sort')">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-updatedAt">
                {{ t('staff.sortUpdatedDesc') }}
              </SelectItem>
              <SelectItem value="updatedAt">
                {{ t('staff.sortUpdatedAsc') }}
              </SelectItem>
              <SelectItem value="-createdAt">
                {{ t('staff.sortCreatedDesc') }}
              </SelectItem>
              <SelectItem value="createdAt">
                {{ t('staff.sortCreatedAsc') }}
              </SelectItem>
            </SelectContent>
          </Select>
          <div class="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              class="shadow-support-primary"
            >
              {{ t('staff.filters.apply') }}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              @click="clearFilters"
            >
              {{ t('staff.filters.clear') }}
            </Button>
          </div>
        </form>

        <p
          v-if="ticketsQuery.isError || ticketsCountQuery.isError"
          class="text-sm text-destructive"
        >
          {{ t('staff.loadError') }}
        </p>

        <div class="min-h-0 flex-1 overflow-auto rounded-support border border-border">
          <table class="hidden w-full min-w-[40rem] text-start text-sm md:table">
            <thead class="bg-support-surface-muted text-xs text-muted-foreground">
              <tr>
                <th class="p-2 font-medium">
                  {{ t('staff.columns.title') }}
                </th>
                <th class="p-2 font-medium">
                  {{ t('staff.columns.updated') }}
                </th>
                <th class="p-2 font-medium">
                  {{ t('staff.columns.staff') }}
                </th>
                <th class="p-2 font-medium">
                  {{ t('staff.columns.department') }}
                </th>
                <th class="p-2 font-medium">
                  {{ t('staff.columns.status') }}
                </th>
                <th class="p-2 font-medium">
                  {{ t('staff.columns.actions') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in tickets"
                :key="row.id"
                class="border-t border-border"
              >
                <td class="p-2">
                  <button
                    type="button"
                    class="text-start"
                    @click="openConversation(row)"
                  >
                    <span class="block font-medium">{{ row.title || row.id }}</span>
                    <span class="block font-mono text-[11px] text-muted-foreground">
                      {{ row.chatID || row.id }}
                    </span>
                  </button>
                </td>
                <td class="p-2 text-xs">
                  {{ formatConversationDate(row.updatedAt, appearance.locale) }}
                </td>
                <td class="p-2 text-xs">
                  {{ staffName(row.staffId) }}
                </td>
                <td class="p-2 text-xs">
                  {{ departmentName(row.departmentId) }}
                </td>
                <td class="p-2">
                  <StatusBadge :status="row.status" />
                </td>
                <td class="p-2">
                  <div class="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      :disabled="row.status === 'closed'"
                      @click="openConvey(row, 'staff')"
                    >
                      {{ t('staff.convey.changeStaff') }}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      :disabled="row.status === 'closed'"
                      @click="openConvey(row, 'department')"
                    >
                      {{ t('staff.convey.changeDepartment') }}
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <ul class="space-y-2 p-2 md:hidden">
            <li
              v-for="row in tickets"
              :key="row.id"
              class="rounded-support bg-support-surface-muted p-3"
            >
              <button
                type="button"
                class="w-full text-start"
                @click="openConversation(row)"
              >
                <span class="block font-medium">{{ row.title || row.id }}</span>
                <span class="block font-mono text-[11px] text-muted-foreground">
                  {{ row.chatID || row.id }}
                </span>
              </button>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge :status="row.status" />
                <span>{{ staffName(row.staffId) }}</span>
                <span>{{ departmentName(row.departmentId) }}</span>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ formatConversationDate(row.updatedAt, appearance.locale) }}
              </p>
              <div class="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  :disabled="row.status === 'closed'"
                  @click="openConvey(row, 'staff')"
                >
                  {{ t('staff.convey.changeStaff') }}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  :disabled="row.status === 'closed'"
                  @click="openConvey(row, 'department')"
                >
                  {{ t('staff.convey.changeDepartment') }}
                </Button>
              </div>
            </li>
          </ul>

          <p
            v-if="ticketsEnabled && tickets.length === 0 && !ticketsQuery.isPending"
            class="px-3 py-8 text-center text-sm text-muted-foreground"
          >
            {{ t('staff.emptyTickets') }}
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{{ t('staff.pagination', { from: fromRow, to: toRow, total }) }}</span>
          <div class="flex flex-wrap gap-2">
            <Select
              :model-value="String(rowsPerPage)"
              @update:model-value="rowsPerPage = Number($event); page = 1"
            >
              <SelectTrigger class="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">
                  10
                </SelectItem>
                <SelectItem value="20">
                  20
                </SelectItem>
                <SelectItem value="50">
                  50
                </SelectItem>
              </SelectContent>
            </Select>
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
      </TabsContent>
    </Tabs>

    <ConveyDialog
      v-model:open="conveyOpen"
      :conversation="conveyTarget"
      :departments="departments"
      :mode="conveyMode"
    />
  </div>
</template>
