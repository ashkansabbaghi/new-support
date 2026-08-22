import { unwrapBackendList } from './conversation'
import { toPlainText } from './message'

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

export type Department = {
  id: string
  name: string
  description?: string
  icon?: string
}

export type FaqItem = {
  id: string
  question: string
  excerpt: string
  answer: string
  departmentId?: string
  tags: string[]
}

export type StaffAvailability = {
  count: number
  sample: Array<{ id: string; name: string }>
}

export function toDepartment(raw: unknown): Department | null {
  const record = asRecord(raw)
  if (!record) {
    return null
  }
  const id = pickString(record, ['id', '_id'])
  const name = pickString(record, ['name', 'title'])
  if (!id || !name) {
    return null
  }
  const description =
    pickString(record, ['description']) ?? (toPlainText(record.description) || undefined)
  const icon = pickString(record, ['icon'])
  return {
    id,
    name,
    ...(description ? { description } : {}),
    ...(icon ? { icon } : {}),
  }
}

export function toDepartmentList(raw: unknown): Department[] {
  const items: Department[] = []
  for (const item of unwrapBackendList(raw)) {
    const department = toDepartment(item)
    if (department) {
      items.push(department)
    }
  }
  return items
}

export function toFaq(raw: unknown): FaqItem | null {
  const record = asRecord(raw)
  if (!record) {
    return null
  }
  const id = pickString(record, ['id', '_id'])
  const question = pickString(record, ['question', 'title'])
  if (!id || !question) {
    return null
  }
  const excerpt =
    pickString(record, ['excerpt', 'answer_excerpt', 'answerExcerpt']) ??
    toPlainText(record.excerpt)
  const answer =
    pickString(record, ['answer', 'body', 'content']) ?? toPlainText(record.answer)
  return {
    id,
    question,
    excerpt,
    answer,
    tags: toStringList(record.tags),
    ...(pickString(record, ['department', 'departmentId'])
      ? { departmentId: pickString(record, ['department', 'departmentId']) }
      : {}),
  }
}

export function toStringList(raw: unknown): string[] {
  const items = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : raw == null
        ? []
        : [raw]
  const values: string[] = []
  for (const item of items) {
    if (typeof item === 'string' && item.length > 0) {
      values.push(item)
      continue
    }
    const record = asRecord(item)
    const label = record ? pickString(record, ['tag', 'name', 'label', 'category', 'title']) : undefined
    if (label) {
      values.push(label)
    }
  }
  return [...new Set(values)]
}

export function toFaqList(raw: unknown): FaqItem[] {
  const items: FaqItem[] = []
  for (const item of unwrapBackendList(raw)) {
    const faq = toFaq(item)
    if (faq) {
      items.push(faq)
    }
  }
  return items
}

export function toStaffAvailability(raw: unknown): StaffAvailability {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { count: raw, sample: [] }
  }

  const record = asRecord(raw)
  if (!record) {
    const list = Array.isArray(raw) ? raw : []
    return {
      count: list.length,
      sample: list
        .map((item, index) => {
          const row = asRecord(item)
          const id = row ? pickString(row, ['id', '_id']) : undefined
          const name = row ? pickString(row, ['nickName', 'nickname', 'name', 'firstName']) : undefined
          return id ? { id, name: name ?? id } : { id: `staff_${index}`, name: name ?? '' }
        })
        .filter((item) => item.name),
    }
  }

  const countValue = record.count
  const sampleRaw = record.sample
  const sample = Array.isArray(sampleRaw)
    ? sampleRaw
        .map((item) => {
          const row = asRecord(item)
          if (!row) {
            return null
          }
          const id = pickString(row, ['id', '_id'])
          const name = pickString(row, ['nickName', 'nickname', 'name', 'firstName'])
          if (!id) {
            return null
          }
          return { id, name: name ?? id }
        })
        .filter((item): item is { id: string; name: string } => item !== null)
    : []

  const count =
    typeof countValue === 'number' && Number.isFinite(countValue) ? countValue : sample.length

  return { count, sample }
}

export function applyAvailabilityEvent(
  current: StaffAvailability,
  eventName: string,
  data: unknown,
): StaffAvailability {
  const record = asRecord(data)
  const id = record ? pickString(record, ['id', 'userID', 'userId', 'staff']) : undefined
  const name = record ? pickString(record, ['nickName', 'nickname', 'name']) : undefined

  if (eventName === 'availed' || eventName === 'STAFF_JOINED') {
    const sample = id && !current.sample.some((item) => item.id === id)
      ? [...current.sample, { id, name: name ?? id }]
      : current.sample
    return { count: current.count + 1, sample }
  }

  if (eventName === 'unAvailed' || eventName === 'STAFF_LEFT') {
    const sample = id ? current.sample.filter((item) => item.id !== id) : current.sample
    return { count: Math.max(0, current.count - 1), sample }
  }

  return current
}
