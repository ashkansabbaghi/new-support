<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { Button } from '@/components/ui/button'

const { t } = useI18n()
</script>

<template>
  <main class="support-safe-pad support-vv-min-height bg-background p-6 text-foreground">
    <h1 class="text-xl font-semibold">
      {{ t('placeholder.title') }}
    </h1>
    <p class="mt-2 text-sm text-muted-foreground">
      {{ t('placeholder.body') }}
    </p>
    <div class="mt-4 flex flex-wrap gap-2">
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
