import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PROTOCOL_MAJOR, PROTOCOL_MAX_MINOR, PROTOCOL_MIN_MINOR } from '../src/constants.js'
import { describe, expect, it } from 'vitest'

const releasesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../examples/releases/v1',
)

const CHANNELS = ['canary', 'internal', 'stable'] as const

type ReleaseManifest = {
  schemaVersion: number
  channel: string
  protocol: {
    major: number
    minMinor: number
    maxMinor: number
    version: string
  }
  module: { version: string; url: string; integrity: string }
  loader: { version: string; url: string; integrity: string }
}

describe('release manifests (protocol major + channel)', () => {
  it('publishes static JSON for internal / canary / stable under v1/', async () => {
    const files = (await readdir(releasesRoot)).filter((name) => name.endsWith('.json')).sort()
    expect(files).toEqual(CHANNELS.map((channel) => `${channel}.json`))

    for (const channel of CHANNELS) {
      const raw = JSON.parse(await readFile(join(releasesRoot, `${channel}.json`), 'utf8')) as ReleaseManifest
      expect(raw.schemaVersion).toBe(1)
      expect(raw.channel).toBe(channel)
      expect(raw.protocol.major).toBe(PROTOCOL_MAJOR)
      expect(raw.protocol.minMinor).toBe(PROTOCOL_MIN_MINOR)
      expect(raw.protocol.maxMinor).toBe(PROTOCOL_MAX_MINOR)
      expect(raw.module.version).toMatch(/^\d+\.\d+\.\d+/)
      expect(raw.module.integrity).toMatch(/^sha(256|384|512)-/)
      expect(raw.loader.integrity).toMatch(/^sha(256|384|512)-/)
      expect(raw.module.url).not.toContain('latest')
      expect(raw.loader.url).toContain(`/v${PROTOCOL_MAJOR}/`)
    }
  })
})
