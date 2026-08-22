import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'support-sdk',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
