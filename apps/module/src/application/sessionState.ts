import { computed, ref } from 'vue'

import type { SessionSnapshot } from '@nipoto/support-sdk'

import { isFixtureMode } from './fixtures'

const connected = ref(false)
const hasSession = ref(false)
const generation = ref(0)

export function syncSessionSnapshot(snapshot: SessionSnapshot): void {
  connected.value = snapshot.connected
  hasSession.value = snapshot.hasSession
  generation.value = snapshot.generation
}

export function resetSessionSnapshot(): void {
  connected.value = false
  hasSession.value = false
  generation.value = 0
}

export function useSessionReady() {
  return computed(() => connected.value && hasSession.value)
}

export function isSessionReady(): boolean {
  return connected.value && hasSession.value
}

/** Queries may run against the gateway or recorded fixtures. */
export function isPresentationReady(): boolean {
  return isSessionReady() || isFixtureMode()
}

export function usePresentationReady() {
  return computed(() => isSessionReady() || isFixtureMode())
}
