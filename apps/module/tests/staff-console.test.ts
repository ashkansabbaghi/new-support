import { describe, expect, it } from 'vitest'

import {
  ClosedConversationError,
  createFixtureUseCases,
  FIXTURE_IDS,
  resetFixtureState,
  setFixtureStaffRoles,
} from '../src/application'
import {
  buildTicketListQuery,
  eventTouchesThread,
  isTicketListManager,
  jalaliToGregorianIso,
  mapBackendEventToDomain,
  parseJalaliDateInput,
  ticketListQueryReady,
} from '../src/domain'

describe('jalali query dates', () => {
  it('converts Nowruz 1403 to Gregorian', () => {
    expect(jalaliToGregorianIso(1403, 1, 1)).toBe('2024-03-20')
    expect(parseJalaliDateInput('1403/05/31')).toBe('2024-08-21')
    expect(parseJalaliDateInput('not-a-date')).toBeUndefined()
  })
})

describe('ticket list filter (B4 client still sends staff)', () => {
  it('forces filter.staff to self for supporter and technicalManager', () => {
    const input = { title: 'login', status: 'opened', staff: 'someone-else' }
    expect(
      buildTicketListQuery(input, { staffId: 'me_1', roles: ['supporter'] }),
    ).toMatchObject({ title: 'login', status: 'opened', staff: 'me_1' })
    expect(
      buildTicketListQuery(input, { staffId: 'me_1', roles: ['technicalManager'] }),
    ).toMatchObject({ staff: 'me_1' })
    expect(isTicketListManager(['technicalManager'])).toBe(false)
    expect(ticketListQueryReady({ roles: ['supporter'] })).toBe(false)
  })

  it('lets supportManager omit staff and converts Jalali range', () => {
    const query = buildTicketListQuery(
      {
        status: 'opened',
        updatedAtFromJalali: '1403/01/01',
        updatedAtToJalali: '1403/01/02',
        rowsPerPage: 10,
        sortBy: '-updatedAt',
      },
      { staffId: 'mgr_1', roles: ['supportManager'] },
    )
    expect(query.staff).toBeUndefined()
    expect(query.status).toBe('opened')
    expect(query.updatedAtFrom).toBe('2024-03-20')
    expect(query.sortBy).toBe('-updatedAt')
    expect(isTicketListManager(['supportManager'])).toBe(true)
  })
})

describe('staff console fixtures', () => {
  it('filters tickets, refuses closed convey, and consumes predetermined text', async () => {
    resetFixtureState()
    const usecases = createFixtureUseCases()

    const listed = await usecases.listConversations({ title: 'sign in', staff: FIXTURE_IDS.staff })
    expect(listed.map((item) => item.id)).toEqual([FIXTURE_IDS.opened])
    expect(await usecases.countConversations({ status: 'closed' })).toBe(1)

    await expect(
      usecases.conveyConversation({ conversationId: FIXTURE_IDS.closed, data: { staff: FIXTURE_IDS.staffOther } }),
    ).rejects.toBeInstanceOf(ClosedConversationError)

    await usecases.conveyConversation({
      conversationId: FIXTURE_IDS.opened,
      data: { staff: FIXTURE_IDS.staffOther, forceAssigning: true },
    })
    expect((await usecases.getConversation(FIXTURE_IDS.opened))?.staffId).toBe(FIXTURE_IDS.staffOther)

    const answers = await usecases.listPredetermined()
    expect(answers[0]?.content).toContain('screenshot')
    await usecases.sendText({ conversationId: FIXTURE_IDS.opened, text: answers[0]!.content })
  })

  it('exposes current staff roles for presentation gating only', async () => {
    resetFixtureState()
    setFixtureStaffRoles(['supporter'])
    const usecases = createFixtureUseCases()
    const me = await usecases.getCurrentStaff()
    expect(me?.id).toBe(FIXTURE_IDS.staff)
    expect(isTicketListManager(me?.roles)).toBe(false)
  })
})

describe('domain events stay on the Chat bus', () => {
  it('does not invent NEW_TICKETS_MESSAGE', () => {
    const mapped = mapBackendEventToDomain({
      source: 'bus',
      name: 'messageSent',
      generation: 1,
      data: { chatID: 'chat_1' },
    })
    expect(mapped.name).toBe('messageSent')
    expect(eventTouchesThread(mapped)).toBe(true)
    expect(mapped.name).not.toBe('NEW_TICKETS_MESSAGE')
  })
})
