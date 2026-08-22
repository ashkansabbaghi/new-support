import { computed } from 'vue'

import { useCurrentStaff } from '@/application'
import {
  canManageAvailability,
  canManageDepartments,
  canManageFaqs,
  canManagePredetermined,
  isTicketListManager,
  type TicketListActor,
} from '@/domain'

export function useStaffActor() {
  const profileQuery = useCurrentStaff()

  const actor = computed<TicketListActor>(() => ({
    staffId: profileQuery.data.value?.id,
    roles: profileQuery.data.value?.roles,
  }))

  const roles = computed(() => actor.value.roles)
  const isManager = computed(() => isTicketListManager(roles.value))
  const staffId = computed(() => actor.value.staffId)
  const manageDepartments = computed(() => canManageDepartments(roles.value))
  const manageFaqs = computed(() => canManageFaqs(roles.value))
  const managePredetermined = computed(() => canManagePredetermined(roles.value))
  const manageAvailability = computed(() => canManageAvailability(roles.value))

  return {
    profileQuery,
    actor,
    isManager,
    staffId,
    manageDepartments,
    manageFaqs,
    managePredetermined,
    manageAvailability,
  }
}

export function ticketStatusI18nKey(status: string | undefined): string {
  if (!status) {
    return 'staff.status.opened'
  }
  if (status === 'staff-replied') {
    return 'staff.status.staff replied'
  }
  if (status === 'user-replied') {
    return 'staff.status.user replied'
  }
  return `staff.status.${status}`
}
