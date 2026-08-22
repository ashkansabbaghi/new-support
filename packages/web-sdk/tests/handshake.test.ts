import { describe, expect, it } from 'vitest'

import { IFRAME_SANDBOX } from '../src/constants.js'
import { isCompatibleProtocol } from '../src/inspect.js'
import { exactOrigin } from '../src/origin.js'
import { createCancellablePromise } from '../src/pending.js'
import { clampResize, parseResizeHint } from '../src/resize.js'
import { buildSessionSetPayload, nextSessionGeneration } from '../src/session.js'
import { assertSafeModuleUrl, buildDeepLinkUrl, buildModuleEntryUrl } from '../src/url.js'
import { SupportSdkError } from '../src/errors.js'

describe('origin and protocol compatibility', () => {
  it('requires an exact http(s) origin', () => {
    expect(exactOrigin('https://support.nipoto.test/app')).toBe('https://support.nipoto.test')
    expect(() => exactOrigin('*')).toThrow(SupportSdkError)
    expect(() => exactOrigin('null')).toThrow(SupportSdkError)
    expect(() => exactOrigin('https://user:pass@support.nipoto.test')).toThrow(SupportSdkError)
  })

  it('accepts the current and previous protocol minor of the same major', () => {
    expect(isCompatibleProtocol({ major: 1, minMinor: 0, maxMinor: 0 })).toBe(true)
    expect(isCompatibleProtocol({ major: 2, minMinor: 0, maxMinor: 0 })).toBe(false)
    // When the loader supports minor 1 it must still accept the previous minor (0).
    expect(isCompatibleProtocol({ major: 1, minMinor: 0, maxMinor: 0 }, 1)).toBe(true)
    expect(isCompatibleProtocol({ major: 1, minMinor: 0, maxMinor: 1 }, 1)).toBe(true)
    expect(isCompatibleProtocol({ major: 1, minMinor: 2, maxMinor: 2 }, 1)).toBe(false)
  })
})

describe('iframe URL and sandbox', () => {
  it('builds a public entry URL without tokens and uses the minimal sandbox', () => {
    expect(IFRAME_SANDBOX).toBe('allow-scripts allow-forms allow-same-origin')
    expect(IFRAME_SANDBOX.includes('allow-top-navigation')).toBe(false)

    const href = buildModuleEntryUrl('http://localhost:5173', {
      widgetId: 'wid_public_example',
      locale: 'fa-IR',
    })
    const url = new URL(href)
    expect(url.origin).toBe('http://localhost:5173')
    expect(url.searchParams.get('widgetId')).toBe('wid_public_example')
    expect(url.searchParams.has('token')).toBe(false)
  })

  it('keeps deep links token-free and rejects credential query keys', () => {
    expect(buildDeepLinkUrl('http://localhost:5173', 'conversation.home')).toBe(
      'http://localhost:5173/#/conversation/home',
    )
    expect(() => assertSafeModuleUrl('http://localhost:5173/?token=secret')).toThrow(SupportSdkError)
    expect(() => assertSafeModuleUrl('http://localhost:5173/#/?access_token=secret')).toThrow(SupportSdkError)
  })
})

describe('SESSION_SET payload', () => {
  it('sends a generation bump and ignores a host-supplied token', () => {
    const payload = buildSessionSetPayload(3, {
      token: 'super-secret',
      credential: { scheme: 'bearer', value: 'leak-me' },
      authorization: 'Bearer leak-me',
    })
    expect(payload.generation).toBe(3)
    expect(payload.credential).toEqual({ scheme: 'bearer', value: 'cookie' })
    expect(nextSessionGeneration(2)).toBe(3)
    expect(nextSessionGeneration(2, { generation: 9 })).toBe(9)
    expect(nextSessionGeneration(2, { generation: 1 })).toBe(3)
  })
})

describe('resize and cancellable promises', () => {
  it('clamps resize hints from validated channel messages', () => {
    expect(clampResize(200, 200)).toEqual({ width: 280, height: 240 })
    expect(clampResize(70, 70)).toEqual({ width: 88, height: 88 })
    expect(clampResize(9000, 9000)).toEqual({ width: 720, height: 900 })
    expect(
      parseResizeHint({
        channel: 'nipoto.support',
        payload: { width: 400, height: 500 },
      }),
    ).toEqual({ width: 400, height: 500 })
    expect(
      parseResizeHint({
        channel: 'nipoto.support',
        type: 'MODULE_OPENED',
        width: 88,
        height: 88,
        payload: { surface: 'chat' },
      }),
    ).toEqual({ width: 88, height: 88 })
    expect(parseResizeHint({ payload: { width: 400, height: 500 } })).toBeNull()
  })

  it('times out and cancels command promises', async () => {
    const timed = createCancellablePromise<void>(() => undefined, { timeoutMs: 5 })
    await expect(timed).rejects.toMatchObject({ code: 'TIMEOUT' })

    const controller = new AbortController()
    const aborted = createCancellablePromise<void>(() => undefined, {
      timeoutMs: 5_000,
      signal: controller.signal,
    })
    controller.abort()
    await expect(aborted).rejects.toMatchObject({ code: 'CANCELLED' })

    const cancellable = createCancellablePromise<void>(() => undefined, { timeoutMs: 5_000 })
    cancellable.cancel()
    await expect(cancellable).rejects.toMatchObject({ code: 'CANCELLED' })
  })
})
