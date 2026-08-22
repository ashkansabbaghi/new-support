export function createObjectUrlRegistry() {
  const urls = new Set<string>()

  return {
    add(url: string): string {
      urls.add(url)
      return url
    },
    revokeAll(): void {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        for (const url of urls) {
          try {
            URL.revokeObjectURL(url)
          } catch {
            // ignore
          }
        }
      }
      urls.clear()
    },
    size(): number {
      return urls.size
    },
  }
}

export type ObjectUrlRegistry = ReturnType<typeof createObjectUrlRegistry>
