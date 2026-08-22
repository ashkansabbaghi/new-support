<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import { isSessionReady, requestExternalNavigation, requestHostResize, useFixtureMode } from '@/application'
import { Button } from '@/components/ui/button'
import WidgetHeader from '@/components/widget/WidgetHeader.vue'
import WidgetLauncher from '@/components/widget/WidgetLauncher.vue'
import { useWidgetNavigation } from '@/composables/useWidgetNavigation'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const ui = useUiStore()
const { go } = useWidgetNavigation()
const { drawerOpen, surface } = storeToRefs(ui)

const fixtureMode = useFixtureMode()
const isUserSurface = computed(() => surface.value === 'chat')
const showDemo = computed(() => fixtureMode.value && !isSessionReady())

watch(
  isUserSurface,
  (userSurface) => {
    if (!userSurface) {
      void go({ name: 'ticket.list', replace: true })
    }
  },
  { immediate: true },
)

watch(
  [drawerOpen, isUserSurface],
  ([open, userSurface]) => {
    if (!userSurface) {
      return
    }
    requestHostResize(open ? { width: 380, height: 640 } : { width: 88, height: 88 })
  },
)
</script>

<template>
  <div
    v-if="isUserSurface"
    class="support-safe-pad support-vv-height relative overflow-hidden bg-transparent"
  >
    <div class="pointer-events-none fixed inset-0 flex items-end justify-end p-0 md:p-4">
      <WidgetLauncher
        v-if="!drawerOpen"
        class="pointer-events-auto m-4 md:m-0"
      />
      <section
        v-else
        class="pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-background text-foreground shadow-support-card md:h-[min(640px,100%)] md:w-[min(380px,100%)] md:rounded-support-card"
        role="dialog"
        :aria-label="t('chat.global.support-title')"
      >
        <WidgetHeader />
        <p
          v-if="showDemo"
          class="shrink-0 bg-support-surface-muted px-3 py-2 text-[11px] text-muted-foreground"
        >
          {{ t('widget.session.demo') }}
          <Button
            type="button"
            variant="link"
            class="h-auto p-0 text-[11px]"
            @click="requestExternalNavigation('login')"
          >
            {{ t('widget.session.auth') }}
          </Button>
        </p>
        <div class="flex min-h-0 flex-1 flex-col">
          <RouterView />
        </div>
        <p class="shrink-0 py-2 text-center text-[10px] tracking-wide text-muted-foreground">
          {{ t('widget.powered') }}
        </p>
      </section>
    </div>
  </div>
</template>
