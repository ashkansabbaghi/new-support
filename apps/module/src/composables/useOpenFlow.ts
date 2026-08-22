import {
  reportConversationState,
  useOpenConversationMutation,
} from '@/application'
import { resolveOpenOutcome } from '@/domain'
import { useUiStore } from '@/stores/ui'

import { useWidgetNavigation } from './useWidgetNavigation'

export function useOpenFlow() {
  const mutation = useOpenConversationMutation()
  const ui = useUiStore()
  const { go } = useWidgetNavigation()

  async function open(input: { department: string; title: string }): Promise<void> {
    const raw = await mutation.mutateAsync(input)
    const { conversation, state } = resolveOpenOutcome(raw)
    ui.setActiveConversationId(conversation.id)
    ui.clearStartDraft()
    reportConversationState({ conversationId: conversation.id, state })
    if (state === 'queued') {
      await go({ name: 'conversation.queue', replace: true })
      return
    }
    await go({
      name: 'conversation.view',
      params: { conversationId: conversation.id },
      replace: true,
    })
  }

  return {
    open,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
