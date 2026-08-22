import type { PayloadByType } from '@nipoto/support-protocol'

export const SEMANTIC_ROUTE_NAMES = [
  'conversation.home',
  'conversation.new',
  'conversation.view',
  'conversation.queue',
  'conversation.history',
  'ticket.list',
  'ticket.view',
] as const

export type SemanticRouteName = (typeof SEMANTIC_ROUTE_NAMES)[number]

export type SemanticRouteParams = {
  conversationId?: string
}

export type SemanticRoute = {
  name: SemanticRouteName
  params?: SemanticRouteParams
  replace?: boolean
}

export const CONVERSATION_ID_PATTERN = /^[A-Za-z0-9_-]+$/
export const CONVERSATION_ID_MAX_LENGTH = 128

export const VIEW_ROUTE_NAMES = ['conversation.view', 'ticket.view'] as const

export type ViewRouteName = (typeof VIEW_ROUTE_NAMES)[number]

export type SemanticRouteValidation =
  | { ok: true; route: SemanticRoute }
  | { ok: false; reason: 'unknown-name' | 'missing-conversation-id' | 'invalid-conversation-id' }

export function isSemanticRouteName(value: unknown): value is SemanticRouteName {
  return typeof value === 'string' && (SEMANTIC_ROUTE_NAMES as readonly string[]).includes(value)
}

export function isViewRouteName(value: unknown): value is ViewRouteName {
  return value === 'conversation.view' || value === 'ticket.view'
}

export function isValidConversationId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= CONVERSATION_ID_MAX_LENGTH &&
    CONVERSATION_ID_PATTERN.test(value)
  )
}

/** Chat and ticket view routes address the same Conversation id. */
export function conversationIdFromRoute(route: Pick<SemanticRoute, 'name' | 'params'>): string | undefined {
  if (!isViewRouteName(route.name)) {
    return undefined
  }
  const id = route.params?.conversationId
  return isValidConversationId(id) ? id : undefined
}

export function viewRouteForConversation(
  conversationId: string,
  surface: 'chat' | 'ticket' = 'chat',
): SemanticRoute {
  return {
    name: surface === 'ticket' ? 'ticket.view' : 'conversation.view',
    params: { conversationId },
  }
}

export function validateSemanticRoute(input: unknown): SemanticRouteValidation {
  if (!input || typeof input !== 'object' || !('name' in input)) {
    return { ok: false, reason: 'unknown-name' }
  }

  const record = input as {
    name?: unknown
    params?: { conversationId?: unknown }
    replace?: unknown
  }

  if (!isSemanticRouteName(record.name)) {
    return { ok: false, reason: 'unknown-name' }
  }

  const conversationId = record.params?.conversationId
  if (conversationId !== undefined && !isValidConversationId(conversationId)) {
    return { ok: false, reason: 'invalid-conversation-id' }
  }

  if (isViewRouteName(record.name) && !isValidConversationId(conversationId)) {
    return { ok: false, reason: 'missing-conversation-id' }
  }

  const route: SemanticRoute = { name: record.name }
  if (isValidConversationId(conversationId)) {
    route.params = { conversationId }
  }
  if (typeof record.replace === 'boolean') {
    route.replace = record.replace
  }
  return { ok: true, route }
}

export function toNavigatePayload(route: SemanticRoute): PayloadByType['NAVIGATE'] {
  return {
    name: route.name,
    ...(route.params === undefined ? {} : { params: route.params }),
    ...(route.replace === undefined ? {} : { replace: route.replace }),
  }
}

export function routesShareConversation(left: SemanticRoute, right: SemanticRoute): boolean {
  const leftId = conversationIdFromRoute(left)
  const rightId = conversationIdFromRoute(right)
  return leftId !== undefined && leftId === rightId
}

/** Staff console uses ticket.* surfaces. User conversation.* routes stay for side=user. */
export function remapRouteForSide(
  route: SemanticRoute,
  side: 'user' | 'staff',
): SemanticRoute {
  if (side !== 'staff') {
    return route
  }
  if (route.name === 'conversation.view' && isValidConversationId(route.params?.conversationId)) {
    return { ...route, name: 'ticket.view' }
  }
  if (route.name.startsWith('conversation.')) {
    return { name: 'ticket.list', ...(route.replace === undefined ? {} : { replace: route.replace }) }
  }
  return route
}
