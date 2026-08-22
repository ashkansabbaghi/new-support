import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSessionManager } from '../src/session/SessionManager.js'
import { UploadRequestError, uploadAvatar, uploadFile } from '../src/gateway/upload.js'
import type { SupportApp } from '../src/app.js'

function createConnectedSession(cookie = 'user-token=user-secret') {
  const session = createSessionManager({
    instanceId: 'upload',
    side: 'user',
    env: { hostname: 'localhost' },
    cookieSource: () => cookie,
    connect: async () => ({ Support: {}, User: {}, Mastering: {} }) as SupportApp,
  })
  return session
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('REST upload', () => {
  it('posts JSON base64 with the Phase 4 cookie authorization header', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'file_1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const session = createConnectedSession()
    await session.set(1)

    await uploadFile(session, 'https://back.test', {
      file: 'YmFzZTY0',
      name: 'shot.jpg',
      mimeType: 'image/jpeg',
      size: 12,
    })

    expect(fetchMock).toHaveBeenCalledWith('https://back.test/file/upload/support', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'user-secret',
      },
      body: JSON.stringify({
        file: 'YmFzZTY0',
        name: 'shot.jpg',
        mimeType: 'image/jpeg',
        size: 12,
      }),
    })
  })

  it('sends avatar to /support/upload with field=avatar and the same cookie token', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const session = createSessionManager({
      instanceId: 'avatar',
      side: 'staff',
      env: { hostname: 'localhost' },
      cookieSource: () => 'staff-token=staff-secret',
      connect: async () => ({ Support: {}, User: {}, Mastering: {} }) as SupportApp,
    })
    await session.set(1)

    await uploadAvatar(session, 'https://back.test', {
      file: 'aaa',
      size: 4,
      mimeType: 'image/png',
      name: 'me.png',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://back.test/support/upload',
      expect.objectContaining({
        headers: {
          'content-type': 'application/json',
          authorization: 'staff-secret',
        },
        body: JSON.stringify({
          file: 'aaa',
          size: 4,
          mimeType: 'image/png',
          name: 'me.png',
          field: 'avatar',
        }),
      }),
    )
  })

  it('surfaces WRONG_FILE_TYPE and MAXIMUM_FILE_SIZE_LIMIT from the existing REST body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ code: 'WRONG_FILE_TYPE' }), { status: 400 })),
    )
    const session = createConnectedSession()
    await session.set(1)
    await expect(
      uploadFile(session, 'https://back.test', { file: 'x', name: 'a.gif', mimeType: 'image/gif', size: 1 }),
    ).rejects.toMatchObject({ code: 'WRONG_FILE_TYPE' })
    expect(UploadRequestError).toBeTypeOf('function')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('MAXIMUM_FILE_SIZE_LIMIT', { status: 413 })),
    )
    await expect(
      uploadFile(session, 'https://back.test', { file: 'x', name: 'a.jpg', mimeType: 'image/jpeg', size: 1 }),
    ).rejects.toMatchObject({ code: 'MAXIMUM_FILE_SIZE_LIMIT' })
  })
})
