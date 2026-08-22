import {
  FILE_ERROR_HEIC,
  FileClientError,
  assertAllowedImage,
  isHeicFile,
  type BrowserFileLike,
} from '@/domain'

export type PreparedImage = {
  name: string
  mimeType: 'image/jpeg' | 'image/png'
  size: number
  base64: string
}

type ConvertibleFile = BrowserFileLike & {
  arrayBuffer: () => Promise<ArrayBuffer>
}

function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim())
  return match?.[1]?.toLowerCase() ?? ''
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

async function fileToBase64(file: ConvertibleFile): Promise<string> {
  const buffer = await file.arrayBuffer()
  return bytesToBase64(new Uint8Array(buffer))
}

function renameToJpeg(name: string): string {
  return name.replace(/\.(heic|heif|jpe?g|png)$/i, '') + '.jpg'
}

async function convertHeicToJpeg(file: ConvertibleFile): Promise<ConvertibleFile> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    throw new FileClientError(FILE_ERROR_HEIC)
  }

  try {
    const bitmap = await createImageBitmap(file as unknown as Blob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new FileClientError(FILE_ERROR_HEIC)
    }
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (next) => {
          if (next) {
            resolve(next)
            return
          }
          reject(new FileClientError(FILE_ERROR_HEIC))
        },
        'image/jpeg',
        0.9,
      )
    })
    return new File([blob], renameToJpeg(file.name), { type: 'image/jpeg' })
  } catch (error) {
    if (error instanceof FileClientError) {
      throw error
    }
    throw new FileClientError(FILE_ERROR_HEIC)
  }
}

export async function prepareImageForUpload(
  file: ConvertibleFile,
  options: { avatar?: boolean } = {},
): Promise<PreparedImage> {
  assertAllowedImage(file, options)
  const converted = isHeicFile(file) ? await convertHeicToJpeg(file) : file
  if (isHeicFile(converted)) {
    throw new FileClientError(FILE_ERROR_HEIC)
  }

  const ext = extensionOf(converted.name)
  const mimeType: PreparedImage['mimeType'] =
    converted.type === 'image/png' || ext === 'png' ? 'image/png' : 'image/jpeg'
  const name =
    mimeType === 'image/png'
      ? converted.name.replace(/\.(heic|heif|jpe?g)$/i, '') + (ext === 'png' ? '' : '.png')
      : converted.name.replace(/\.(heic|heif|png)$/i, '') + (ext === 'jpg' || ext === 'jpeg' ? '' : '.jpg')

  return {
    name: name || (mimeType === 'image/png' ? 'image.png' : 'image.jpg'),
    mimeType,
    size: converted.size,
    base64: await fileToBase64(converted),
  }
}

export function toSendFilePayload(conversationId: string, uploaded: unknown): { chatID: string } & Record<string, unknown> {
  if (uploaded && typeof uploaded === 'object' && !Array.isArray(uploaded)) {
    const record = uploaded as Record<string, unknown>
    if (typeof record.chatID === 'string') {
      return record as { chatID: string } & Record<string, unknown>
    }
    return { chatID: conversationId, ...record }
  }
  return { chatID: conversationId, file: uploaded }
}

export function fileResultToObjectUrl(raw: unknown): string | null {
  if (typeof raw === 'string' && (raw.startsWith('blob:') || raw.startsWith('data:image/'))) {
    return raw
  }
  if (typeof Blob !== 'undefined' && raw instanceof Blob) {
    return URL.createObjectURL(raw)
  }
  if (raw instanceof ArrayBuffer) {
    return URL.createObjectURL(new Blob([raw]))
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    if (typeof record.url === 'string' && (record.url.startsWith('blob:') || record.url.startsWith('data:image/'))) {
      return record.url
    }
    const binary = record.data ?? record.content ?? record.file
    const mime =
      typeof record.mimeType === 'string'
        ? record.mimeType
        : typeof record.type === 'string'
          ? record.type
          : 'image/jpeg'
    if (typeof binary === 'string' && binary.length > 0) {
      const payload = binary.startsWith('data:') ? binary : `data:${mime};base64,${binary}`
      return payload
    }
    if (binary instanceof ArrayBuffer) {
      return URL.createObjectURL(new Blob([binary], { type: mime }))
    }
    if (typeof Blob !== 'undefined' && binary instanceof Blob) {
      return URL.createObjectURL(binary)
    }
  }
  return null
}
