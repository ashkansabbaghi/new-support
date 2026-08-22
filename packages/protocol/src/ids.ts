const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
    return bytes
  }
  for (let i = 0; i < size; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

/** ULID-shaped id (26 Crockford characters). Used for instance/message/request ids. */
export function createId(): string {
  const time = Date.now()
  const chars: string[] = Array.from({ length: 26 }, () => '0')
  let remaining = time
  for (let i = 9; i >= 0; i -= 1) {
    chars[i] = CROCKFORD[remaining % 32] ?? '0'
    remaining = Math.floor(remaining / 32)
  }
  const entropy = randomBytes(16)
  let bitBuffer = 0
  let bitCount = 0
  let index = 10
  for (const byte of entropy) {
    bitBuffer = (bitBuffer << 8) | byte
    bitCount += 8
    while (bitCount >= 5 && index < 26) {
      bitCount -= 5
      chars[index] = CROCKFORD[(bitBuffer >> bitCount) & 31] ?? '0'
      index += 1
    }
  }
  return chars.join('')
}

export function nowIso(): string {
  return new Date().toISOString()
}
