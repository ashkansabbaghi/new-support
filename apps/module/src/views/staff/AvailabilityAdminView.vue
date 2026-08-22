<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  isFixtureMode,
  peekSupportUseCases,
  useAvailabilityStaff,
  useCurrentStaff,
  useSetAvailableMutation,
  useSetUnavailableMutation,
} from '@/application'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useStaffActor } from '@/composables/useStaffActor'

const { t } = useI18n()
const { manageAvailability, staffId } = useStaffActor()
const meQuery = useCurrentStaff()
const staffQuery = useAvailabilityStaff()
const availMutation = useSetAvailableMutation()
const unavailMutation = useSetUnavailableMutation()
const errorMessage = ref('')

const staff = computed(() => staffQuery.data.value ?? [])
const me = computed(() => staff.value.find((item) => item.id === staffId.value) ?? null)
const selfAvailable = computed(() => me.value?.available === true)
const busy = computed(() => availMutation.isPending.value || unavailMutation.isPending.value)

onMounted(async () => {
  const usecases = peekSupportUseCases()
  if (!usecases || isFixtureMode()) {
    return
  }
  try {
    await usecases.subscribeAvailability()
  } catch {
    // Presence is advisory; B5 still leaves hidden-tab semantics open.
  }
})

onUnmounted(() => {
  if (!isFixtureMode()) {
    peekSupportUseCases()?.unsubscribeAvailability()
  }
})

async function startWork(): Promise<void> {
  errorMessage.value = ''
  try {
    await availMutation.mutateAsync()
  } catch {
    errorMessage.value = t('staff.admin.saveError')
  }
}

async function endWork(userId?: string): Promise<void> {
  errorMessage.value = ''
  try {
    await unavailMutation.mutateAsync(userId)
  } catch {
    errorMessage.value = t('staff.admin.saveError')
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
    <p
      v-if="!manageAvailability"
      class="text-sm text-muted-foreground"
    >
      {{ t('staff.noAccess') }}
    </p>

    <template v-else>
      <div>
        <h1 class="text-base font-semibold">
          {{ t('staff.admin.staffs') }}
        </h1>
        <p class="text-xs text-muted-foreground">
          {{ t('staff.admin.availabilityHint') }}
        </p>
      </div>

      <section class="rounded-support border border-border bg-support-surface-muted p-3">
        <p class="text-sm">
          {{ t('staff.admin.yourStatus') }}
          <Badge
            :variant="selfAvailable ? 'secondary' : 'outline'"
            class="ms-1"
          >
            {{ selfAvailable ? t('staff.admin.available') : t('staff.admin.unavailable') }}
          </Badge>
        </p>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ meQuery.data.value?.name || staffId }}
        </p>
        <Button
          type="button"
          size="sm"
          class="mt-3 w-full shadow-support-primary sm:w-auto"
          :disabled="busy"
          :variant="selfAvailable ? 'destructive' : 'default'"
          @click="selfAvailable ? endWork() : startWork()"
        >
          {{ selfAvailable ? t('staff.admin.endWork') : t('staff.admin.startWork') }}
        </Button>
      </section>

      <p
        v-if="staffQuery.isError"
        class="text-sm text-destructive"
      >
        {{ t('staff.admin.loadError') }}
      </p>
      <p
        v-if="errorMessage"
        class="text-xs text-destructive"
      >
        {{ errorMessage }}
      </p>

      <ul
        v-if="staff.length > 0"
        class="space-y-2"
      >
        <li
          v-for="member in staff"
          :key="member.id"
          class="flex flex-col gap-2 rounded-support border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-medium">
              {{ member.name }}
            </p>
            <Badge
              :variant="member.available ? 'secondary' : 'outline'"
              class="mt-1"
            >
              {{ member.available ? t('staff.admin.available') : t('staff.admin.unavailable') }}
            </Badge>
          </div>
          <Button
            v-if="member.available && member.id !== staffId"
            type="button"
            size="sm"
            variant="outline"
            :disabled="busy"
            @click="endWork(member.id)"
          >
            {{ t('staff.admin.endWork') }}
          </Button>
        </li>
      </ul>

      <p
        v-else-if="!staffQuery.isPending"
        class="py-8 text-center text-sm text-muted-foreground"
      >
        {{ t('staff.admin.emptyStaff') }}
      </p>
    </template>
  </div>
</template>
