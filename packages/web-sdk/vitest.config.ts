import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'support-web-sdk',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
