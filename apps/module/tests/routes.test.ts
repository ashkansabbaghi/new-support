import { describe, expect, it } from 'vitest'

import { conversationDetailKeyForRoute } from '../src/application/queryKeys'
import {
  conversationIdFromRoute,
  remapRouteForSide,
  routesShareConversation,
  validateSemanticRoute,
  viewRouteForConversation,
} from '../src/domain'
import { isAdminInternalPath } from '../src/router/admin'
import { parseInternalPath, pathForSemantic } from '../src/router/semantic'

describe('semantic route validation', () => {
  it('accepts the seven host route names', () => {
    for (const name of [
      'conversation.home',
      'conversation.new',
      'conversation.queue',
      'conversation.history',
      'ticket.list',
    ] as const) {
      expect(validateSemanticRoute({ name })).toEqual({ ok: true, route: { name } })
    }
  })

  it('requires a safe conversationId on view routes', () => {
    expect(validateSemanticRoute({ name: 'conversation.view' }).ok).toBe(false)
    expect(validateSemanticRoute({ name: 'ticket.view', params: { conversationId: '' } }).ok).toBe(
      false,
    )
    expect(
      validateSemanticRoute({
        name: 'conversation.view',
        params: { conversationId: 'not a token!' },
      }).ok,
    ).toBe(false)
    expect(
      validateSemanticRoute({
        name: 'ticket.view',
        params: { conversationId: 'chat_123456' },
      }),
    ).toEqual({
      ok: true,
      route: { name: 'ticket.view', params: { conversationId: 'chat_123456' } },
    })
  })

  it('rejects unknown names and keeps replace when valid', () => {
    expect(validateSemanticRoute({ name: 'support.ticket' }).ok).toBe(false)
    expect(validateSemanticRoute({ name: 'conversation.home', replace: true })).toEqual({
      ok: true,
      route: { name: 'conversation.home', replace: true },
    })
  })

  it('treats ticket.view and conversation.view as the same conversation', () => {
    const chat = viewRouteForConversation('conv_1', 'chat')
    const ticket = viewRouteForConversation('conv_1', 'ticket')
    expect(chat.name).toBe('conversation.view')
    expect(ticket.name).toBe('ticket.view')
    expect(conversationIdFromRoute(chat)).toBe('conv_1')
    expect(conversationIdFromRoute(ticket)).toBe('conv_1')
    expect(routesShareConversation(chat, ticket)).toBe(true)
    expect(conversationDetailKeyForRoute(chat.name, 'conv_1')).toEqual(
      conversationDetailKeyForRoute(ticket.name, 'conv_1'),
    )
  })
})

describe('internal hash paths', () => {
  it('round-trips semantic names without exposing them as a public contract', () => {
    expect(pathForSemantic({ name: 'conversation.home' })).toBe('/conversation/home')
    expect(
      pathForSemantic({ name: 'conversation.view', params: { conversationId: 'abc_1' } }),
    ).toBe('/conversation/view/abc_1')
    expect(pathForSemantic({ name: 'ticket.view', params: { conversationId: 'abc_1' } })).toBe(
      '/ticket/view/abc_1',
    )
    expect(parseInternalPath('#/conversation/view/abc_1')?.params?.conversationId).toBe(
      parseInternalPath('/ticket/view/abc_1')?.params?.conversationId,
    )
  })
})

describe('module-internal admin paths', () => {
  it('keeps FAQ / Department / availability off the host semantic contract', () => {
    expect(parseInternalPath('/departments')).toBeNull()
    expect(parseInternalPath('/faqs')).toBeNull()
    expect(isAdminInternalPath('/departments')).toBe(true)
  })
})

describe('staff route remap', () => {
  it('keeps user conversation routes on side=user', () => {
    expect(remapRouteForSide({ name: 'conversation.home' }, 'user')).toEqual({
      name: 'conversation.home',
    })
  })

  it('maps staff conversation surfaces onto ticket.* without a Ticket API', () => {
    expect(remapRouteForSide({ name: 'conversation.home' }, 'staff')).toEqual({
      name: 'ticket.list',
    })
    expect(
      remapRouteForSide({ name: 'conversation.view', params: { conversationId: 'chat_1' } }, 'staff'),
    ).toEqual({ name: 'ticket.view', params: { conversationId: 'chat_1' } })
  })
})
