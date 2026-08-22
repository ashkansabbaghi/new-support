import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import {
  isFixtureMode,
  peekSupportUseCases,
  useAvailableStaff,
} from '@/application'
import { applyAvailabilityEvent, toStaffAvailability, type StaffAvailability } from '@/domain'

export function useAvailability() {
  const query = useAvailableStaff()
  const live = ref<StaffAvailability | null>(null)

  const availability = computed(() => {
    if (live.value) {
      return live.value
    }
    return toStaffAvailability(query.data.value)
  })

  const online = computed(() => availability.value.count > 0)

  watch(
    () => query.data.value,
    (value) => {
      live.value = toStaffAvailability(value)
    },
    { immediate: true },
  )

  onMounted(async () => {
    const usecases = peekSupportUseCases()
    if (!usecases || isFixtureMode()) {
      return
    }
    try {
      await usecases.subscribeAvailability()
    } catch {
      // Availability is advisory; open() still decides queued vs opened.
    }
  })

  onUnmounted(() => {
    if (!isFixtureMode()) {
      peekSupportUseCases()?.unsubscribeAvailability()
    }
  })

  function applyEvent(name: string, data: unknown): void {
    live.value = applyAvailabilityEvent(availability.value, name, data)
  }

  return {
    availability,
    online,
    isPending: query.isPending,
    applyEvent,
  }
}
