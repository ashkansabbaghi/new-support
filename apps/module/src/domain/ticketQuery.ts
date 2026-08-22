import type { ConversationQuery } from '@nipoto/support-sdk'

import { parseJalaliDateInput } from './jalali'
import { isTicketListManager } from './staff'

export const TICKET_STATUS_VALUES = [
  'queued',
  'processing',
  'opened',
  'reopened',
  'staff replied',
  'user replied',
  'conveyed',
  'requeued',
  'closed',
] as const

export type TicketStatusValue = (typeof TICKET_STATUS_VALUES)[number]

export type TicketListFilterInput = {
  title?: string
  status?: string
  staff?: string
  department?: string
  updatedAtFromJalali?: string
  updatedAtToJalali?: string
  startRow?: number
  rowsPerPage?: number
  sortBy?: string
}

export type TicketListActor = {
  staffId?: string
  roles?: readonly string[]
}

/**
 * Presentation still sends filter.staff (B4). Backend is the source of truth.
 * Non-managers — including technicalManager — are forced to self.
 * supportManager may leave staff empty.
 */
export function buildTicketListQuery(
  input: TicketListFilterInput,
  actor: TicketListActor,
): ConversationQuery {
  const manager = isTicketListManager(actor.roles)
  const staff = manager ? input.staff || undefined : actor.staffId
  const updatedAtFrom = parseJalaliDateInput(input.updatedAtFromJalali)
  const updatedAtTo = parseJalaliDateInput(input.updatedAtToJalali)

  return {
    ...(input.title?.trim() ? { title: input.title.trim() } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(staff ? { staff } : {}),
    ...(input.department ? { department: input.department } : {}),
    ...(updatedAtFrom ? { updatedAtFrom } : {}),
    ...(updatedAtTo ? { updatedAtTo } : {}),
    ...(input.startRow !== undefined ? { startRow: input.startRow } : {}),
    ...(input.rowsPerPage !== undefined ? { rowsPerPage: input.rowsPerPage } : {}),
    ...(input.sortBy ? { sortBy: input.sortBy } : {}),
  }
}

export function ticketListQueryReady(actor: TicketListActor): boolean {
  if (isTicketListManager(actor.roles)) {
    return true
  }
  return Boolean(actor.staffId)
}
