import { PROTOCOL_CHANNEL } from '@nipoto/support-protocol'

import { RESIZE_DEFAULT, RESIZE_LAUNCHER, RESIZE_MAX, RESIZE_MIN } from './constants.js'

export function clampResize(width: number, height: number): { width: number; height: number } {
  const nextWidth = Math.round(width)
  const nextHeight = Math.round(height)
  if (nextWidth <= RESIZE_LAUNCHER.width && nextHeight <= RESIZE_LAUNCHER.height) {
    return { width: RESIZE_LAUNCHER.width, height: RESIZE_LAUNCHER.height }
  }
  return {
    width: Math.min(RESIZE_MAX.width, Math.max(RESIZE_MIN.width, nextWidth)),
    height: Math.min(RESIZE_MAX.height, Math.max(RESIZE_MIN.height, nextHeight)),
  }
}

export function defaultOpenSize(): { width: number; height: number } {
  return clampResize(RESIZE_DEFAULT.width, RESIZE_DEFAULT.height)
}

function readDimension(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Accept width/height on a validated channel message (payload or envelope), then clamp. */
export function parseResizeHint(data: unknown): { width: number; height: number } | null {
  if (!data || typeof data !== 'object') {
    return null
  }
  const record = data as { channel?: unknown; payload?: unknown; width?: unknown; height?: unknown }
  if (record.channel !== PROTOCOL_CHANNEL) {
    return null
  }
  const payload =
    record.payload && typeof record.payload === 'object'
      ? (record.payload as { width?: unknown; height?: unknown })
      : undefined
  const width = readDimension(record.width) ?? readDimension(payload?.width)
  const height = readDimension(record.height) ?? readDimension(payload?.height)
  if (width == null || height == null) {
    return null
  }
  return clampResize(width, height)
}
