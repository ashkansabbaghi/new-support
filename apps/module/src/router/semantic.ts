import type { RouteLocationNormalizedLoaded } from 'vue-router'

import {
  isSemanticRouteName,
  isValidConversationId,
  validateSemanticRoute,
  type SemanticRoute,
  type SemanticRouteName,
} from '@/domain'

export const SEMANTIC_PATHS: Record<SemanticRouteName, string> = {
  'conversation.home': '/conversation/home',
  'conversation.new': '/conversation/new',
  'conversation.view': '/conversation/view/:conversationId',
  'conversation.queue': '/conversation/queue',
  'conversation.history': '/conversation/history',
  'ticket.list': '/ticket/list',
  'ticket.view': '/ticket/view/:conversationId',
}

const PATH_BY_NAME = SEMANTIC_PATHS

const VIEW_PATHS: Array<{
  prefix: string
  name: 'conversation.view' | 'ticket.view'
}> = [
  { prefix: '/conversation/view/', name: 'conversation.view' },
  { prefix: '/ticket/view/', name: 'ticket.view' },
]

export function pathForSemantic(route: SemanticRoute): string {
  const template = PATH_BY_NAME[route.name]
  if (template.includes(':conversationId')) {
    const conversationId = route.params?.conversationId
    if (!isValidConversationId(conversationId)) {
      throw new Error('[support] conversationId is required for view routes')
    }
    return template.replace(':conversationId', encodeURIComponent(conversationId))
  }
  return template
}

export function normalizeInternalPath(path: string): string {
  const withoutHash = path.startsWith('#') ? path.slice(1) : path
  const withoutQuery = withoutHash.split('?')[0] ?? ''
  if (!withoutQuery || withoutQuery === '/') {
    return '/'
  }
  return withoutQuery.replace(/\/+$/, '') || '/'
}

export function parseInternalPath(path: string): SemanticRoute | null {
  const clean = normalizeInternalPath(path)

  for (const view of VIEW_PATHS) {
    if (clean.startsWith(view.prefix)) {
      const conversationId = decodeURIComponent(clean.slice(view.prefix.length))
      const validated = validateSemanticRoute({ name: view.name, params: { conversationId } })
      return validated.ok ? validated.route : null
    }
  }

  for (const [name, template] of Object.entries(PATH_BY_NAME) as Array<
    [SemanticRouteName, string]
  >) {
    if (!template.includes(':') && normalizeInternalPath(template) === clean) {
      return { name }
    }
  }

  return null
}

export function parseEntryLocation(entry: { hash: string; search?: string }): SemanticRoute | null {
  void entry.search
  if (!entry.hash) {
    return null
  }
  return parseInternalPath(entry.hash)
}

export function semanticFromVueRoute(
  route: Pick<RouteLocationNormalizedLoaded, 'meta' | 'params' | 'name'>,
): SemanticRoute | null {
  const fromMeta = route.meta.semanticName
  const name = isSemanticRouteName(fromMeta)
    ? fromMeta
    : typeof route.name === 'string' && isSemanticRouteName(route.name)
      ? route.name
      : null
  if (!name) {
    return null
  }

  const rawId = route.params.conversationId
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId
  const validated = validateSemanticRoute({
    name,
    ...(isValidConversationId(conversationId) ? { params: { conversationId } } : {}),
  })
  return validated.ok ? validated.route : null
}

export function canConsumeBack(historyState: { back?: unknown } | null | undefined): boolean {
  return historyState != null && historyState.back != null
}
