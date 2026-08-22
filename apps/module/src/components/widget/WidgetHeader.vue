<script setup lang="ts">
import { History, MessageCirclePlus, Minimize2, MoreHorizontal } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import {
  reportConversationState,
  useCloseConversationMutation,
  useConversation,
  useReopenConversationMutation,
} from '@/application'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppearance } from '@/composables/useAppearance'
import { useAvailability } from '@/composables/useAvailability'
import { useWidgetNavigation } from '@/composables/useWidgetNavigation'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()
const appearance = useAppearance()
const { go } = useWidgetNavigation()
const { online, availability } = useAvailability()

const conversationId = computed(() => {
  const raw = route.params.conversationId
  const fromRoute = Array.isArray(raw) ? raw[0] : raw
  return fromRoute || ui.activeConversationId || undefined
})

const conversationQuery = useConversation(conversationId)
const closeMutation = useCloseConversationMutation()
const reopenMutation = useReopenConversationMutation()

const title = computed(() => {
  if (conversationQuery.data.value?.staffName) {
    return conversationQuery.data.value.staffName
  }
  return t('chat.global.support-title')
})

const subtitle = computed(() => {
  if (conversationQuery.data.value?.departmentName) {
    return conversationQuery.data.value.departmentName
  }
  return online.value ? t('chat.global.online') : t('chat.global.offline')
})

const sampleInitial = computed(() => availability.value.sample[0]?.name?.slice(0, 1) ?? 'ن')

async function endConversation(): Promise<void> {
  const id = conversationId.value
  if (!id) {
    return
  }
  await closeMutation.mutateAsync(id)
  reportConversationState({ conversationId: id, state: 'closed' })
  ui.setActiveConversationId(null)
  await go({ name: 'conversation.home', replace: true })
}

async function reopenConversation(): Promise<void> {
  const id = conversationId.value
  if (!id) {
    return
  }
  await reopenMutation.mutateAsync(id)
  reportConversationState({ conversationId: id, state: 'reopened' })
  await go({ name: 'conversation.view', params: { conversationId: id } })
}
</script>

<template>
  <header
    class="flex h-[var(--support-size-header)] shrink-0 items-center gap-2 bg-support-header px-3 text-support-header-foreground"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <Avatar class="size-10 border-[3px] border-white/25 bg-support-primary-soft">
        <AvatarFallback class="bg-support-primary-soft text-sm text-white">
          {{ sampleInitial }}
        </AvatarFallback>
      </Avatar>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold">
          {{ title }}
        </p>
        <p class="flex items-center gap-1 truncate text-xs text-white/80">
          <span
            class="size-1.5 shrink-0 rounded-full"
            :class="online ? 'bg-support-online' : 'bg-white/50'"
          />
          {{ subtitle }}
        </p>
      </div>
    </div>

    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      class="text-white hover:bg-white/15 hover:text-white"
      :aria-label="t('chat.global.menu.history')"
      @click="go({ name: 'conversation.history' })"
    >
      <History class="size-4" />
    </Button>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          class="text-white hover:bg-white/15 hover:text-white"
          :aria-label="t('chat.global.menu.title')"
        >
          <MoreHorizontal class="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{{ t('chat.global.menu.title') }}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="go({ name: 'conversation.new' })">
          <MessageCirclePlus class="size-4" />
          {{ t('widget.newChat') }}
        </DropdownMenuItem>
        <DropdownMenuItem @click="go({ name: 'conversation.history' })">
          {{ t('chat.global.menu.history') }}
        </DropdownMenuItem>
        <DropdownMenuItem
          v-if="conversationId && conversationQuery.data.value?.status !== 'closed'"
          variant="destructive"
          @click="endConversation"
        >
          {{ t('chat.global.menu.end') }}
        </DropdownMenuItem>
        <DropdownMenuItem
          v-if="conversationId && conversationQuery.data.value?.status === 'closed'"
          @click="reopenConversation"
        >
          {{ t('widget.reopen') }}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="appearance.toggleTheme()">
          {{ t('chat.settings.style.dark-mode') }}
        </DropdownMenuItem>
        <DropdownMenuItem @click="appearance.toggleLocale()">
          {{ appearance.locale === 'fa-IR' ? t('kitchen.localeEn') : t('kitchen.localeFa') }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      class="text-white hover:bg-white/15 hover:text-white"
      :aria-label="t('chat.global.close')"
      @click="ui.closeDrawer()"
    >
      <Minimize2 class="size-4" />
    </Button>
  </header>
</template>
