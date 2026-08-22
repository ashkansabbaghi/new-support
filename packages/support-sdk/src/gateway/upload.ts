import { isAuthFailure } from '../session/SessionManager.js'
import type { SessionManager } from '../session/SessionManager.js'
import type { UploadAvatarInput, UploadFileInput } from './types.js'

export const UPLOAD_ERROR_WRONG_TYPE = 'WRONG_FILE_TYPE'
export const UPLOAD_ERROR_SIZE_LIMIT = 'MAXIMUM_FILE_SIZE_LIMIT'

export class UploadRequestError extends Error {
  readonly code: string
  readonly status?: number

  constructor(code: string, status?: number) {
    super(code)
    this.name = 'UploadRequestError'
    this.code = code
    this.status = status
  }
}

function extractUploadErrorCode(body: string): string | undefined {
  if (!body) {
    return undefined
  }
  if (body.includes(UPLOAD_ERROR_WRONG_TYPE)) {
    return UPLOAD_ERROR_WRONG_TYPE
  }
  if (body.includes(UPLOAD_ERROR_SIZE_LIMIT)) {
    return UPLOAD_ERROR_SIZE_LIMIT
  }
  try {
    const parsed = JSON.parse(body) as { code?: unknown; error?: unknown; message?: unknown }
    for (const value of [parsed.code, parsed.error, parsed.message]) {
      if (value === UPLOAD_ERROR_WRONG_TYPE || value === UPLOAD_ERROR_SIZE_LIMIT) {
        return value
      }
    }
  } catch {
    // body is not JSON
  }
  return undefined
}

async function postJson(
  url: string,
  body: unknown,
  authorization: string | undefined,
  session: SessionManager,
): Promise<unknown> {
  if (!authorization) {
    session.notifyAuthRequired('missing')
    throw new Error('[SupportGateway] missing auth cookie for upload')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()

  if (response.status === 401) {
    session.notifyAuthRequired('unauthorized')
    throw Object.assign(new Error('unauthorized'), { status: 401 })
  }

  if (!response.ok) {
    const code = extractUploadErrorCode(text) ?? `upload failed (${response.status})`
    throw new UploadRequestError(code, response.status)
  }

  if (!text) {
    return undefined
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function uploadAvatar(
  session: SessionManager,
  restUrl: string,
  input: UploadAvatarInput,
): Promise<unknown> {
  try {
    return await postJson(
      `${restUrl}/support/upload`,
      { ...input, field: 'avatar' },
      session.getAuthorization(),
      session,
    )
  } catch (error) {
    if (isAuthFailure(error)) {
      session.notifyAuthRequired('unauthorized')
    }
    throw error
  }
}

export async function uploadFile(
  session: SessionManager,
  restUrl: string,
  input: UploadFileInput,
): Promise<unknown> {
  const payload = { ...input }
  delete payload.side
  try {
    return await postJson(
      `${restUrl}/file/upload/support`,
      payload,
      session.getAuthorization(),
      session,
    )
  } catch (error) {
    if (isAuthFailure(error)) {
      session.notifyAuthRequired('unauthorized')
    }
    throw error
  }
}
