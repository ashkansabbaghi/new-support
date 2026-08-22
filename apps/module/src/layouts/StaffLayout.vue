<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'

import {
  isSessionReady,
  requestExternalNavigation,
  useFixtureMode,
  useOpenConversationCount,
} from '@/application'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppearance } from '@/composables/useAppearance'
import { useStaffActor } from '@/composables/useStaffActor'
import { useWidgetNavigation } from '@/composables/useWidgetNavigation'
import { ADMIN_PATHS } from '@/router/admin'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()
const appearance = useAppearance()
const { go } = useWidgetNavigation()
const { manageDepartments, manageFaqs, managePredetermined, manageAvailability } = useStaffActor()
const { openChatCount, staffListFilter } = storeToRefs(ui)
const fixtureMode = useFixtureMode()

const countQuery = useOpenConversationCount(staffListFilter)
const showDemo = computed(() => fixtureMode.value && !isSessionReady())
const isList = computed(() => route.meta.semanticName === 'ticket.list')

watch(
  () => countQuery.data.value,
  (value) => {
    if (typeof value === 'number') {
      ui.setOpenChatCount(value)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="support-safe-pad support-vv-height flex flex-col overflow-hidden bg-background text-foreground">
    <header class="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-support-header px-3 py-3 text-support-header-foreground sm:px-4">
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold">
          {{ t('staff.title') }}
        </p>
        <p class="text-xs text-white/80">
          {{ t('staff.badge', { count: openChatCount }) }}
        </p>
      </div>
      <Badge
        variant="secondary"
        class="bg-white/20 text-white"
      >
        {{ openChatCount }}
      </Badge>
      <Button
        v-if="!isList"
        type="button"
        size="sm"
        variant="ghost"
        class="text-white hover:bg-white/15 hover:text-white"
        @click="go({ name: 'ticket.list' })"
      >
        {{ t('staff.backToList') }}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        class="text-white hover:bg-white/15 hover:text-white"
        @click="appearance.toggleTheme()"
      >
        {{ t('chat.settings.style.dark-mode') }}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        class="text-white hover:bg-white/15 hover:text-white"
        @click="appearance.toggleLocale()"
      >
        {{ appearance.locale === 'fa-IR' ? t('kitchen.localeEn') : t('kitchen.localeFa') }}
      </Button>
    </header>

    <nav class="flex shrink-0 flex-wrap gap-1 border-b border-border bg-support-surface-muted px-3 py-2">
      <RouterLink
        to="/ticket/list"
        class="rounded-md px-2 py-1 text-xs"
        :class="isList ? 'bg-background font-medium' : 'text-muted-foreground'"
      >
        {{ t('staff.tickets') }}
      </RouterLink>
      <RouterLink
        v-if="manageDepartments"
        :to="ADMIN_PATHS.departments"
        class="rounded-md px-2 py-1 text-xs"
        :class="route.path === ADMIN_PATHS.departments ? 'bg-background font-medium' : 'text-muted-foreground'"
      >
        {{ t('staff.admin.departments') }}
      </RouterLink>
      <RouterLink
        v-if="manageFaqs"
        :to="ADMIN_PATHS.faqs"
        class="rounded-md px-2 py-1 text-xs"
        :class="route.path === ADMIN_PATHS.faqs ? 'bg-background font-medium' : 'text-muted-foreground'"
      >
        {{ t('staff.admin.faqs') }}
      </RouterLink>
      <RouterLink
        v-if="managePredetermined"
        :to="ADMIN_PATHS.predetermined"
        class="rounded-md px-2 py-1 text-xs"
        :class="route.path === ADMIN_PATHS.predetermined ? 'bg-background font-medium' : 'text-muted-foreground'"
      >
        {{ t('staff.admin.predetermined') }}
      </RouterLink>
      <RouterLink
        v-if="manageAvailability"
        :to="ADMIN_PATHS.staffs"
        class="rounded-md px-2 py-1 text-xs"
        :class="route.path === ADMIN_PATHS.staffs ? 'bg-background font-medium' : 'text-muted-foreground'"
      >
        {{ t('staff.admin.staffs') }}
      </RouterLink>
    </nav>

    <p
      v-if="showDemo"
      class="shrink-0 bg-support-surface-muted px-3 py-2 text-[11px] text-muted-foreground"
    >
      {{ t('staff.demo') }}
      <Button
        type="button"
        variant="link"
        class="h-auto p-0 text-[11px]"
        @click="requestExternalNavigation('login')"
      >
        {{ t('staff.auth') }}
      </Button>
    </p>

    <div class="flex min-h-0 flex-1 flex-col">
      <RouterView />
    </div>
  </div>
</template>
