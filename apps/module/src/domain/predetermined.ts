import { unwrapBackendList } from './conversation'

export type PredeterminedAnswer = {
  id: string
  title: string
  content: string
  category: string
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
  }
  return undefined
}

export function toPredeterminedAnswer(raw: unknown): PredeterminedAnswer | null {
  const record = asRecord(raw)
  if (!record) {
    return null
  }
  const id = pickString(record, ['id', '_id'])
  const title = pickString(record, ['title', 'name', 'label'])
  const content = pickString(record, ['content', 'text', 'body', 'answer'])
  if (!id || !title || !content) {
    return null
  }
  return {
    id,
    title,
    content,
    category: pickString(record, ['category', 'group']) ?? '',
  }
}

export function toPredeterminedList(raw: unknown): PredeterminedAnswer[] {
  const items: PredeterminedAnswer[] = []
  for (const item of unwrapBackendList(raw)) {
    const answer = toPredeterminedAnswer(item)
    if (answer) {
      items.push(answer)
    }
  }
  return items
}

export function predeterminedCategories(answers: readonly PredeterminedAnswer[]): string[] {
  return [...new Set(answers.map((item) => item.category).filter(Boolean))]
}
