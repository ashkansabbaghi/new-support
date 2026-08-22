import sanitizeHtml from 'sanitize-html'

/**
 * Known-safe chat / FAQ markup. Unknown rich text becomes plain text.
 * CSP does not replace this. Host safe-html utils are not used.
 */
const KNOWN_TAGS = ['a', 'b', 'br', 'em', 'i', 'li', 'ol', 'p', 'span', 'strong', 'u', 'ul'] as const
const KNOWN_TAG_SET = new Set<string>(KNOWN_TAGS)
const ALLOWED_SCHEMES = ['http', 'https', 'mailto']

export type SanitizedChatBody =
  | { kind: 'html'; html: string; text: string }
  | { kind: 'text'; text: string }

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

export function toPlainText(value: unknown): string {
  if (value == null) {
    return ''
  }
  if (Array.isArray(value)) {
    return value.map((item) => toPlainText(item)).filter(Boolean).join('\n')
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const nested = record.text ?? record.body ?? record.content ?? record.excerpt ?? record.answer
    if (nested !== undefined && nested !== value) {
      return toPlainText(nested)
    }
    return ''
  }

  const raw = String(value)
  const withoutTags = raw.replace(/<[^>]*>/g, ' ')
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim()
}

function collectTags(html: string): string[] {
  const tags: string[] = []
  const pattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html))) {
    tags.push(match[1]!.toLowerCase())
  }
  return tags
}

function looksLikeHtml(value: string): boolean {
  return /<[a-zA-Z!/?]/.test(value)
}

function hasUnknownRichText(html: string): boolean {
  if (/<!--|<!doctype|<svg|<math/i.test(html)) {
    return true
  }
  return collectTags(html).some((tag) => !KNOWN_TAG_SET.has(tag))
}

export function sanitizeChatHtml(value: unknown): SanitizedChatBody {
  if (value == null) {
    return { kind: 'text', text: '' }
  }
  if (typeof value !== 'string') {
    return { kind: 'text', text: toPlainText(value) }
  }

  const raw = value.trim()
  if (!raw) {
    return { kind: 'text', text: '' }
  }
  if (!looksLikeHtml(raw) || hasUnknownRichText(raw)) {
    return { kind: 'text', text: toPlainText(raw) }
  }

  const html = sanitizeHtml(raw, {
    allowedTags: [...KNOWN_TAGS],
    allowedAttributes: {
      a: ['href', 'title'],
    },
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: {
      a: ALLOWED_SCHEMES,
    },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  }).trim()

  if (!html) {
    return { kind: 'text', text: toPlainText(raw) }
  }

  return { kind: 'html', html, text: toPlainText(html) }
}
