import { describe, expect, it } from 'vitest'

import { handleIncomingDomainEvent } from '../src/application/events'
import { shouldAcceptSessionEvent } from '../src/application/sessionGuard'
import type { DomainEvent } from '@nipoto/support-sdk'

function event(generation: number, name = 'opened'): DomainEvent {
  return {
    source: 'aggregate',
    name,
    generation,
    data: { id: 'conv_1', chatID: 'conv_1' },
  }
}

describe('session generation ignore', () => {
  it('accepts events only for the current generation with an active session', () => {
    expect(shouldAcceptSessionEvent(2, { generation: 2, hasSession: true })).toBe(true)
    expect(shouldAcceptSessionEvent(1, { generation: 2, hasSession: true })).toBe(false)
    expect(shouldAcceptSessionEvent(2, { generation: 2, hasSession: false })).toBe(false)
  })

  it('drops stale domain events after SESSION_SET / SESSION_CLEAR', () => {
    const accepted: string[] = []
    const ignored: number[] = []

    handleIncomingDomainEvent(event(1), { generation: 2, hasSession: true }, {
      onAccept: (mapped) => accepted.push(mapped.name),
      onIgnore: (incoming) => ignored.push(incoming.generation),
    })
    handleIncomingDomainEvent(event(3, 'messageSent'), { generation: 3, hasSession: false }, {
      onAccept: (mapped) => accepted.push(mapped.name),
      onIgnore: (incoming) => ignored.push(incoming.generation),
    })

    expect(accepted).toEqual([])
    expect(ignored).toEqual([1, 3])
  })

  it('maps a current-generation backend event and can emit conversation state', () => {
    const states: Array<{ conversationId: string; state: string }> = []
    const mapped = handleIncomingDomainEvent(event(4, 'closed'), { generation: 4, hasSession: true }, {
      onConversationState: (payload) => states.push(payload),
    })

    expect(mapped?.name).toBe('closed')
    expect(mapped?.conversationId).toBe('conv_1')
    expect(states).toEqual([{ conversationId: 'conv_1', state: 'closed' }])
  })
})
