import { QueryClient } from '@tanstack/vue-query'

/**
 * Server lists / history live here (ADR-004).
 * No offline mutation queue — failed writes are not retried or persisted.
 */
export function createSupportQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 15_000,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const supportQueryClient = createSupportQueryClient()
