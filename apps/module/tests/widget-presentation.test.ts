import { describe, expect, it } from 'vitest'

import {
  createFixtureUseCases,
  resetFixtureState,
} from '../src/application/fixtures'
import {
  applyAvailabilityEvent,
  FileClientError,
  FILE_ERROR_SIZE_LIMIT,
  FILE_ERROR_WRONG_TYPE,
  assertAllowedImage,
  isQueuedConversation,
  resolveOpenOutcome,
  toChatMessage,
  toChatMessageList,
  toPlainText,
  toStaffAvailability,
  withDateSeparators,
} from '../src/domain'
import { statusI18nKey } from '../src/domain/status'
import { sanitizeChatHtml } from '../src/lib/sanitizeHtml'
import { notificationForDomainEvent, setHostForeground } from '../src/application/hostSignals'

describe('owned HTML sanitizer', () => {
  it('keeps known-safe markup and turns unknown rich text into plain text', () => {
    expect(sanitizeChatHtml('<b>hello</b> and <em>world</em>')).toEqual({
      kind: 'html',
      html: '<b>hello</b> and <em>world</em>',
      text: 'hello and world',
    })
    expect(sanitizeChatHtml('<script>alert(1)</script><b>ok</b>')).toEqual({
      kind: 'text',
      text: 'alert(1) ok',
    })
    expect(sanitizeChatHtml('<img src=x onerror=alert(1)>')).toMatchObject({ kind: 'text' })
    expect(sanitizeChatHtml('<a href="javascript:alert(1)">x</a>').kind).toBe('html')
    expect(sanitizeChatHtml('<a href="javascript:alert(1)">x</a>').kind === 'html'
      ? sanitizeChatHtml('<a href="javascript:alert(1)">x</a>').html
      : '').not.toContain('javascript:')
    expect(toPlainText('<b>hello</b> &amp; <script>alert(1)</script>')).toBe('hello & alert(1)')
    expect(toPlainText(['line 1', 'line 2'])).toBe('line 1\nline 2')
  })

  it('maps known-safe HTML onto chat messages without trusting XSS fixtures', () => {
    const safe = toChatMessage({
      id: 'm1',
      text: '<p>please see <a href="https://nipoto.test">help</a></p>',
    })
    expect(safe?.html).toContain('<a href="https://nipoto.test">help</a>')
    const xss = toChatMessage({
      id: 'm2',
      text: '<svg/onload=alert(1)><b>hi</b>',
    })
    expect(xss?.html).toBeUndefined()
    expect(xss?.text).toContain('hi')
  })
})

describe('client file allowlist', () => {
  it('accepts jpg/png, caps avatar size, and flags other types', () => {
    expect(() => assertAllowedImage({ name: 'a.jpg', type: 'image/jpeg', size: 12 })).not.toThrow()
    expect(() => assertAllowedImage({ name: 'a.png', type: 'image/png', size: 12 })).not.toThrow()
    expect(() => assertAllowedImage({ name: 'a.gif', type: 'image/gif', size: 12 })).toThrow(FileClientError)
    try {
      assertAllowedImage({ name: 'a.gif', type: 'image/gif', size: 12 })
    } catch (error) {
      expect(error).toMatchObject({ code: FILE_ERROR_WRONG_TYPE })
    }
    expect(() =>
      assertAllowedImage({ name: 'huge.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 + 1 }, { avatar: true }),
    ).toThrow(FILE_ERROR_SIZE_LIMIT)
    expect(() => assertAllowedImage({ name: 'photo.heic', type: 'image/heic', size: 12 })).not.toThrow()
  })
})

describe('host notification adapter payload', () => {
  it('emits data-minimized kinds and skips the active foreground thread', () => {
    setHostForeground(true)
    expect(
      notificationForDomainEvent(
        { source: 'aggregate', name: 'messageSent', generation: 1, conversationId: 'chat_1', data: { text: 'secret' } },
        'chat_1',
      ),
    ).toBeNull()
    expect(
      notificationForDomainEvent(
        { source: 'aggregate', name: 'messageSent', generation: 1, conversationId: 'chat_2', data: { text: 'secret' } },
        'chat_1',
      ),
    ).toEqual({ kind: 'new-message', conversationId: 'chat_2' })
    setHostForeground(false)
    expect(
      notificationForDomainEvent(
        { source: 'aggregate', name: 'queued', generation: 1, conversationId: 'chat_9', conversationState: 'queued', data: {} },
        'chat_9',
      ),
    ).toEqual({ kind: 'queue', conversationId: 'chat_9' })
    setHostForeground(true)
  })
})

describe('message date separators', () => {
  it('inserts a separator when the calendar day changes', () => {
    const items = withDateSeparators(
      toChatMessageList([
        { id: 'a', text: 'first', sentAt: '2026-08-20T10:00:00.000Z', from: 'u1' },
        { id: 'b', text: 'second', sentAt: '2026-08-21T09:00:00.000Z', from: 's1' },
      ]),
    )
    expect(items.map((item) => item.kind)).toEqual(['separator', 'message', 'separator', 'message'])
    expect(items[0]).toMatchObject({ kind: 'separator', dateKey: '2026-08-20' })
    expect(items[2]).toMatchObject({ kind: 'separator', dateKey: '2026-08-21' })
  })
})

describe('open outcome', () => {
  it('treats queuedAt without openedAt as queued', () => {
    const queued = resolveOpenOutcome({
      id: 'chat_queued',
      title: 'Help',
      queuedAt: '2026-08-22T10:00:00.000Z',
    })
    expect(queued.state).toBe('queued')
    expect(isQueuedConversation(queued.conversation)).toBe(true)

    const opened = resolveOpenOutcome({
      id: 'chat_open',
      status: 'opened',
      openedAt: '2026-08-22T10:00:00.000Z',
    })
    expect(opened.state).toBe('opened')
  })
})

describe('status labels', () => {
  it('maps every UI status to an i18n key', () => {
    expect(statusI18nKey('staff replied')).toBe('widget.status.staff-replied')
    expect(statusI18nKey('requeued')).toBe('widget.status.requeued')
    expect(statusI18nKey('unknown')).toBe('widget.status.opened')
  })
})

describe('availability', () => {
  it('reads isThereOnline and applies availed / unAvailed', () => {
    const initial = toStaffAvailability({
      count: 1,
      sample: [{ id: 'st_1', nickName: 'Nila' }],
    })
    expect(initial.count).toBe(1)
    const afterJoin = applyAvailabilityEvent(initial, 'availed', { id: 'st_2', nickName: 'Omid' })
    expect(afterJoin.count).toBe(2)
    const afterLeave = applyAvailabilityEvent(afterJoin, 'unAvailed', { id: 'st_1' })
    expect(afterLeave.count).toBe(1)
    expect(afterLeave.sample.map((item) => item.id)).toEqual(['st_2'])
  })
})

describe('recorded fixtures', () => {
  it('can start a chat and exchange text without a live gateway', async () => {
    resetFixtureState()
    const usecases = createFixtureUseCases()
    const opened = resolveOpenOutcome(
      await usecases.openConversation({ department: 'fix_dept_account', title: 'Need help with login' }),
    )
    expect(opened.state).toBe('opened')
    await usecases.sendText({ conversationId: opened.conversation.id, text: 'still locked out' })
    await usecases.sendFile({
      conversationId: opened.conversation.id,
      file: {
        name: 'shot.jpg',
        type: 'image/jpeg',
        size: 4,
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      },
    })
    const messages = await usecases.getMessages({ conversationId: opened.conversation.id })
    const list = toChatMessageList(messages)
    expect(list.some((item) => item.text === 'still locked out')).toBe(true)
    expect(list.some((item) => item.hasAttachment)).toBe(true)

    const active = await usecases.listActive()
    const closed = await usecases.listClosed()
    expect(active.some((item) => item.id === 'fix_open_1')).toBe(true)
    expect(closed.some((item) => item.id === 'fix_closed_1')).toBe(true)
    expect(active.every((item) => item.status !== 'closed')).toBe(true)
  })
})
