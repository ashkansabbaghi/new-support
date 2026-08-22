export const STAFF_ROLES = ['supporter', 'technicalManager', 'supportManager'] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export type StaffProfile = {
  id: string
  name: string
  roles: string[]
}

export type StaffMember = {
  id: string
  name: string
  available?: boolean
  departments?: string[]
}

export type ConversationUser = {
  id?: string
  name: string
  mobile?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickString(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }
  return undefined
}

function pickRoles(record: Record<string, unknown>): string[] {
  const raw = record.roles
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value)
}

/** Ticket list manager is supportManager only. technicalManager is not. */
export function isTicketListManager(roles: readonly string[] | undefined): boolean {
  return Boolean(roles?.includes('supportManager'))
}

export function canUseStaffConsole(roles: readonly string[] | undefined): boolean {
  return Boolean(roles?.some((role) => isStaffRole(role)))
}

function hasAnyRole(roles: readonly string[] | undefined, allowed: readonly StaffRole[]): boolean {
  return Boolean(roles?.some((role) => allowed.includes(role as StaffRole)))
}

/** Department and FAQ CRUD. Presentation gate only — backend enforces. */
export function canManageDepartments(roles: readonly string[] | undefined): boolean {
  return hasAnyRole(roles, ['technicalManager', 'supportManager'])
}

export function canManageFaqs(roles: readonly string[] | undefined): boolean {
  return canManageDepartments(roles)
}

/** Predetermined CRUD. technicalManager is not in the staff route matrix. */
export function canManagePredetermined(roles: readonly string[] | undefined): boolean {
  return hasAnyRole(roles, ['supporter', 'supportManager'])
}

/** Availability / staffs-list. */
export function canManageAvailability(roles: readonly string[] | undefined): boolean {
  return Boolean(roles?.includes('supportManager'))
}

export function toStaffProfile(raw: unknown): StaffProfile | null {
  const record = asRecord(raw)
  if (!record) {
    return null
  }
  const nested = record.data
  if (nested && typeof nested === 'object' && !record.id && !record.uid) {
    return toStaffProfile(nested)
  }
  const id = pickString(record, ['id', 'uid', '_id'])
  if (!id) {
    return null
  }
  const name =
    pickString(record, ['nickName', 'nickname', 'name', 'firstName']) ?? id
  return {
    id,
    name,
    roles: pickRoles(record),
  }
}

export function toStaffMember(raw: unknown): StaffMember | null {
  const record = asRecord(raw)
  if (!record) {
    return null
  }
  const id = pickString(record, ['id', 'uid', '_id'])
  if (!id) {
    return null
  }
  const available = record.available
  const departmentsRaw = record.departments
  const departments = Array.isArray(departmentsRaw)
    ? departmentsRaw.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : undefined
  return {
    id,
    name: pickString(record, ['nickName', 'nickname', 'name', 'firstName']) ?? id,
    ...(typeof available === 'boolean' ? { available } : {}),
    ...(departments && departments.length > 0 ? { departments } : {}),
  }
}

export function mergeAvailabilityStaff(
  chatStaff: readonly StaffMember[],
  userStaff: readonly StaffMember[],
): StaffMember[] {
  const extras = new Map(userStaff.map((member) => [member.id, member]))
  if (chatStaff.length > 0) {
    return chatStaff.map((member) => {
      const extra = extras.get(member.id)
      return {
        id: member.id,
        name: member.name || extra?.name || member.id,
        ...(member.available !== undefined
          ? { available: member.available }
          : extra?.available !== undefined
            ? { available: extra.available }
            : {}),
        ...(member.departments ?? extra?.departments
          ? { departments: member.departments ?? extra?.departments }
          : {}),
      }
    })
  }
  return [...userStaff]
}

export function toStaffMemberList(raw: unknown): StaffMember[] {
  const items = Array.isArray(raw)
    ? raw
    : raw == null
      ? []
      : typeof raw === 'object' && raw && 'data' in raw && Array.isArray((raw as { data: unknown }).data)
        ? (raw as { data: unknown[] }).data
        : [raw]
  const members: StaffMember[] = []
  for (const item of items) {
    const member = toStaffMember(item)
    if (member) {
      members.push(member)
    }
  }
  return members
}

export function toConversationUser(raw: unknown): ConversationUser | null {
  const record = asRecord(raw)
  if (!record) {
    return null
  }
  const nested = record.userData
  if (nested && typeof nested === 'object') {
    const fromNested = toConversationUser(nested)
    if (fromNested) {
      return fromNested
    }
  }
  const id = pickString(record, ['id', 'userID', 'userId', 'user'])
  const firstName = pickString(record, ['firstName', 'first_name'])
  const lastName = pickString(record, ['lastName', 'last_name'])
  const composed = [firstName, lastName].filter(Boolean).join(' ').trim()
  const name = pickString(record, ['userName', 'name', 'nickName']) ?? composed
  const mobile = pickString(record, ['mobile', 'phone'])
  if (!id && !name && !mobile) {
    return null
  }
  return {
    name: name || mobile || id || '',
    ...(id === undefined ? {} : { id }),
    ...(mobile === undefined ? {} : { mobile }),
  }
}

export function toCount(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }
  const record = asRecord(raw)
  if (record) {
    for (const key of ['count', 'total', 'value'] as const) {
      const value = record[key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value
      }
    }
  }
  if (Array.isArray(raw)) {
    return raw.length
  }
  return 0
}
