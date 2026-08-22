import { afterEach, describe, expect, it, vi } from 'vitest'

import { HOST_ROOT_ID, HOST_STYLE_ID } from '../src/constants.js'
import { createDomContainer } from '../src/iframe.js'

type MockEl = {
  id: string
  textContent: string
  dataset: Record<string, string>
  style: { setProperty: ReturnType<typeof vi.fn> }
  remove: () => void
}

function installDocument() {
  const byId = new Map<string, MockEl>()

  function createEl(): MockEl {
    const el: MockEl = {
      id: '',
      textContent: '',
      dataset: {},
      style: { setProperty: vi.fn() },
      remove() {
        if (el.id) {
          byId.delete(el.id)
        }
      },
    }
    return el
  }

  const document = {
    head: {
      appendChild(el: MockEl) {
        if (el.id) {
          byId.set(el.id, el)
        }
      },
    },
    body: {
      appendChild(el: MockEl) {
        if (el.id) {
          byId.set(el.id, el)
        }
      },
    },
    getElementById(id: string) {
      return byId.get(id) ?? null
    },
    createElement() {
      return createEl()
    },
  }

  vi.stubGlobal('document', document)
  return { byId }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('vanilla host open/dispose leftovers', () => {
  it('removes the host root, injected style, and leaves no extra host node', () => {
    const { byId } = installDocument()
    const container = createDomContainer()

    expect(byId.has(HOST_ROOT_ID)).toBe(true)
    expect(byId.has(HOST_STYLE_ID)).toBe(true)

    container.applyOpen({ width: 380, height: 640 })
    container.applyClose()
    container.dispose()

    expect(byId.has(HOST_ROOT_ID)).toBe(false)
    expect(byId.has(HOST_STYLE_ID)).toBe(false)
    expect(byId.size).toBe(0)
  })
})
