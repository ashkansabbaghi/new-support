export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'] as const
export const HEIC_EXTENSIONS = ['heic', 'heif'] as const
export const AVATAR_MAX_BYTES = 6 * 1024 * 1024

export const FILE_ERROR_WRONG_TYPE = 'WRONG_FILE_TYPE'
export const FILE_ERROR_SIZE_LIMIT = 'MAXIMUM_FILE_SIZE_LIMIT'
export const FILE_ERROR_HEIC = 'HEIC_UNSUPPORTED'

export type FileClientErrorCode =
  | typeof FILE_ERROR_WRONG_TYPE
  | typeof FILE_ERROR_SIZE_LIMIT
  | typeof FILE_ERROR_HEIC

export class FileClientError extends Error {
  readonly code: FileClientErrorCode

  constructor(code: FileClientErrorCode, message = code) {
    super(message)
    this.name = 'FileClientError'
    this.code = code
  }
}

export type BrowserFileLike = {
  name: string
  type: string
  size: number
}

function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim())
  return match?.[1]?.toLowerCase() ?? ''
}

export function isHeicFile(file: BrowserFileLike): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') {
    return true
  }
  return (HEIC_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))
}

export function isAllowedImageFile(file: BrowserFileLike): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png') {
    return true
  }
  return (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))
}

export function assertAllowedImage(file: BrowserFileLike, options: { avatar?: boolean } = {}): void {
  if (isHeicFile(file)) {
    return
  }
  if (!isAllowedImageFile(file)) {
    throw new FileClientError(FILE_ERROR_WRONG_TYPE)
  }
  if (options.avatar && file.size > AVATAR_MAX_BYTES) {
    throw new FileClientError(FILE_ERROR_SIZE_LIMIT)
  }
}

export function fileErrorCode(error: unknown): FileClientErrorCode | string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }
  const code = (error as { code?: unknown }).code
  if (typeof code === 'string' && code.length > 0) {
    return code
  }
  return undefined
}
