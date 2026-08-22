<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useActiveConversations, useClosedConversations } from '@/application'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ConversationList from '@/components/widget/ConversationList.vue'
import { useWidgetNavigation } from '@/composables/useWidgetNavigation'
import { isQueuedConversation, type Conversation } from '@/domain'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const { go } = useWidgetNavigation()
const ui = useUiStore()
const tab = ref('active')

const activeQuery = useActiveConversations({})
const closedQuery = useClosedConversations({})

const active = computed(() => activeQuery.data.value ?? [])
const closed = computed(() => closedQuery.data.value ?? [])

async function select(conversation: Conversation): Promise<void> {
  ui.setActiveConversationId(conversation.id)
  if (isQueuedConversation(conversation)) {
    await go({ name: 'conversation.queue' })
    return
  }
  await go({
    name: 'conversation.view',
    params: { conversationId: conversation.id },
  })
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col p-3">
    <div class="mb-2 flex justify-end">
      <Button
        type="button"
        size="sm"
        variant="outline"
        @click="go({ name: 'conversation.new' })"
      >
        {{ t('widget.newChat') }}
      </Button>
    </div>
    <Tabs
      v-model="tab"
      class="flex min-h-0 flex-1 flex-col"
    >
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="active">
          {{ t('chat.chatLists.chats.title') }}
        </TabsTrigger>
        <TabsTrigger value="closed">
          {{ t('chat.chatLists.closeChat.title') }}
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="active"
        class="mt-3 flex min-h-0 flex-1 flex-col"
      >
        <ConversationList
          :conversations="active"
          empty-key="chat.chatLists.chats.empty"
          @select="select"
        />
      </TabsContent>
      <TabsContent
        value="closed"
        class="mt-3 flex min-h-0 flex-1 flex-col"
      >
        <ConversationList
          :conversations="closed"
          empty-key="chat.chatLists.closeChat.empty"
          @select="select"
        />
      </TabsContent>
    </Tabs>
  </div>
</template>
