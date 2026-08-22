import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { ChatListFilter } from '@nipoto/support-sdk'

import type { ConversationSurface } from '@/domain'

/**
 * Client-owned UI only (ADR-004). No credentials, lists, or message history.
 */
export const useUiStore = defineStore('ui', () => {
  const drawerOpen = ref(true)
  const surface = ref<ConversationSurface>('chat')
  const activeConversationId = ref<string | null>(null)
  const startTitle = ref('')
  const startDepartmentId = ref('')
  const staffListFilter = ref<ChatListFilter>('self')
  const openChatCount = ref(0)

  function openDrawer() {
    drawerOpen.value = true
  }

  function closeDrawer() {
    drawerOpen.value = false
  }

  function toggleDrawer() {
    drawerOpen.value = !drawerOpen.value
  }

  function setDrawerOpen(next: boolean) {
    drawerOpen.value = next
  }

  function setSurface(next: ConversationSurface) {
    surface.value = next
  }

  function setActiveConversationId(id: string | null) {
    activeConversationId.value = id
  }

  function setStartDraft(title: string, departmentId: string) {
    startTitle.value = title
    startDepartmentId.value = departmentId
  }

  function clearStartDraft() {
    startTitle.value = ''
    startDepartmentId.value = ''
  }

  function setStaffListFilter(next: ChatListFilter) {
    staffListFilter.value = next
  }

  function setOpenChatCount(next: number) {
    openChatCount.value = next
  }

  return {
    drawerOpen,
    surface,
    activeConversationId,
    startTitle,
    startDepartmentId,
    staffListFilter,
    openChatCount,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    setDrawerOpen,
    setSurface,
    setActiveConversationId,
    setStartDraft,
    clearStartDraft,
    setStaffListFilter,
    setOpenChatCount,
  }
})
