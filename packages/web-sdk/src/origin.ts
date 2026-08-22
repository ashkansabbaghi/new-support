import { SupportSdkError } from './errors.js'

export function exactOrigin(value: string): string {
  if (!value || value === '*' || value === 'null') {
    throw new SupportSdkError('targetOrigin must be an exact http(s) origin', 'INVALID_ORIGIN')
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new SupportSdkError('targetOrigin must be an exact http(s) origin', 'INVALID_ORIGIN')
  }
  if (url.username || url.password) {
    throw new SupportSdkError('targetOrigin must not include credentials', 'INVALID_ORIGIN')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SupportSdkError('targetOrigin must be http(s)', 'INVALID_ORIGIN')
  }
  return url.origin
}

export function originsMatch(actual: string, expected: string): boolean {
  return actual === expected
}
