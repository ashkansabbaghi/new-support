<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { getSessionManager } from '@/bridge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SessionSnapshot } from '@nipoto/support-sdk'

const snapshot = ref<SessionSnapshot | null>(null)
let unsubscribe: (() => void) | undefined

function refresh() {
  snapshot.value = getSessionManager()?.getSnapshot() ?? null
}

async function connect() {
  const session = getSessionManager()
  if (!session) {
    return
  }
  await session.set(session.getGeneration() + 1)
  refresh()
}

function disconnect() {
  const session = getSessionManager()
  if (!session) {
    return
  }
  session.clear(session.getGeneration() + 1)
  refresh()
}

onMounted(() => {
  refresh()
  unsubscribe = getSessionManager()?.onStateChange((next) => {
    snapshot.value = next
  })
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <main class="support-safe-pad support-vv-min-height bg-background p-6 text-foreground">
    <h1 class="text-xl font-semibold">
      Gateway smoke
    </h1>
    <p class="mt-2 max-w-xl text-sm text-muted-foreground">
      Cookie is the credential. SESSION_SET only bumps generation. No chat UI.
    </p>

    <dl
      v-if="snapshot"
      class="mt-6 grid max-w-xl gap-3 text-sm"
    >
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted-foreground">
          Connection
        </dt>
        <dd>
          <Badge :variant="snapshot.connected ? 'default' : 'secondary'">
            {{ snapshot.connected ? 'connected' : 'disconnected' }}
          </Badge>
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted-foreground">
          Session
        </dt>
        <dd>{{ snapshot.hasSession ? `generation ${snapshot.generation}` : 'none' }}</dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted-foreground">
          Cookie name
        </dt>
        <dd>{{ snapshot.cookieName }}{{ snapshot.hasCookie ? ' (present)' : ' (missing)' }}</dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted-foreground">
          Backend host
        </dt>
        <dd class="font-mono text-xs">
          {{ snapshot.backendHost }}
        </dd>
      </div>
      <div class="flex items-center justify-between gap-4">
        <dt class="text-muted-foreground">
          Login
        </dt>
        <dd class="font-mono text-xs">
          {{ snapshot.loginUrl }}
        </dd>
      </div>
    </dl>

    <div class="mt-6 flex flex-wrap gap-2">
      <Button
        type="button"
        @click="connect"
      >
        Connect (cookie)
      </Button>
      <Button
        type="button"
        variant="outline"
        @click="disconnect"
      >
        SESSION_CLEAR
      </Button>
      <Button
        as-child
        variant="ghost"
      >
        <RouterLink to="/">
          Back
        </RouterLink>
      </Button>
    </div>
  </main>
</template>
