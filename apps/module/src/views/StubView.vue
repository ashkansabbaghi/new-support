<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { Button } from '@/components/ui/button'
import { semanticFromVueRoute } from '@/router/semantic'

const { t } = useI18n()
const route = useRoute()

const semantic = computed(() => semanticFromVueRoute(route))
const title = computed(() => semantic.value?.name ?? String(route.name ?? route.path))
const conversationId = computed(() => semantic.value?.params?.conversationId ?? '')
const showDevLinks = computed(() => semantic.value?.name === 'conversation.home')
</script>

<template>
  <main class="support-safe-pad support-vv-min-height bg-background p-6 text-foreground">
    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {{ t('stub.heading') }}
    </p>
    <h1 class="mt-1 text-xl font-semibold">
      {{ title }}
    </h1>
    <p
      v-if="conversationId"
      class="mt-2 font-mono text-sm text-muted-foreground"
    >
      {{ conversationId }}
    </p>
    <p class="mt-2 text-sm text-muted-foreground">
      {{ t('stub.body') }}
    </p>
    <div
      v-if="showDevLinks"
      class="mt-4 flex flex-wrap gap-2"
    >
      <Button
        as-child
        class="shadow-support-primary"
      >
        <RouterLink to="/dev/kitchen">
          {{ t('placeholder.kitchen') }}
        </RouterLink>
      </Button>
      <Button
        as-child
        variant="outline"
      >
        <RouterLink to="/dev/gateway">
          {{ t('placeholder.gateway') }}
        </RouterLink>
      </Button>
    </div>
  </main>
</template>
