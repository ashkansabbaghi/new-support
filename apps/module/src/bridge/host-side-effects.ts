import { createEnvelope, type HandshakeOutput, type HostCommand } from '@nipoto/support-protocol'
import type { SessionManager } from '@nipoto/support-sdk'

import {
  bindSupportUseCases,
  clearServerState,
  createFixtureUseCases,
  handleIncomingDomainEvent,
  invalidateDomainEventKeys,
  isFixtureMode,
  peekSupportUseCases,
  queryKeysForDomainEvent,
  refetchActiveListAndThread,
  notificationForDomainEvent,
  requestHostNotification,
  resetSessionSnapshot,
  setConversationStateSink,
  setExternalNavigationSink,
  setFixtureMode,
  setHostForeground,
  setSupportUseCases,
  supportQueryClient,
  syncSessionSnapshot,
} from '@/application'
import type { ConversationState, SemanticRoute, SemanticRouteName } from '@/domain'
import { isViewRouteName, remapRouteForSide, validateSemanticRoute } from '@/domain'
import { getSupportGateway } from '@/gateway/runtime'
import { toSupportLocale } from '@/i18n'
import {
  consumeModuleBack,
  currentConversationId,
  currentSemanticRoute,
  navigateFromHost,
} from '@/router/navigation'
import { isAdminInternalPath } from '@/router/admin'
import { parseEntryLocation } from '@/router/semantic'
import { useAppearanceStore } from '@/stores/appearance'
import { useUiStore } from '@/stores/ui'

let pendingEntry: SemanticRoute | null = null
let entryResolved = false

export function captureEntryRoute(entry: { hash: string; search: string }): void {
  pendingEntry = parseEntryLocation(entry)
  entryResolved = false
}

function bindLiveOrFixtureUseCases(session: SessionManager): void {
  const gateway = getSupportGateway()
  const live = Boolean(gateway && session.hasSession() && session.isConnected())
  const wasFixture = isFixtureMode()
  if (live && gateway) {
    bindSupportUseCases({ gateway, session })
    setFixtureMode(false)
    if (wasFixture) {
      void supportQueryClient.invalidateQueries()
    }
    return
  }
  setSupportUseCases(createFixtureUseCases())
  setFixtureMode(true)
  if (!wasFixture) {
    void supportQueryClient.invalidateQueries()
  }
}

export function bindApplicationToSession(session: SessionManager): void {
  bindLiveOrFixtureUseCases(session)
  syncSessionSnapshot(session.getSnapshot())
  session.onStateChange((snapshot) => {
    syncSessionSnapshot(snapshot)
    bindLiveOrFixtureUseCases(session)
    if (snapshot.hasSession && snapshot.connected) {
      void resolveEntryConversation(session)
    }
    if (!snapshot.hasSession) {
      entryResolved = false
    }
  })
  session.setHooks({
    onReconcile(generation) {
      if (!session.isCurrentGeneration(generation)) {
        return
      }
      refetchActiveListAndThread(currentConversationId())
    },
    onDomainEvent(event) {
      handleIncomingDomainEvent(event, session.getSnapshot(), {
        onAccept(mapped) {
          invalidateDomainEventKeys(queryKeysForDomainEvent(mapped))
          const notification = notificationForDomainEvent(mapped, currentConversationId())
          if (notification) {
            requestHostNotification(notification)
          }
        },
        onConversationState(payload) {
          postConversationState?.(payload)
        },
      })
    },
  })
}

let postConversationState:
  | ((payload: { conversationId: string; state: ConversationState }) => void)
  | null = null

export function bindConversationStateSink(
  sink: ((payload: { conversationId: string; state: ConversationState }) => void) | null,
): void {
  postConversationState = sink
  setConversationStateSink(sink)
}

export function bindExternalNavigation(
  sink: (target: 'help' | 'login' | 'account' | 'upgrade') => void,
): void {
  setExternalNavigationSink(sink)
}

function resolveTheme(theme: string): 'light' | 'dark' {
  if (theme === 'dark') {
    return 'dark'
  }
  if (theme === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function applyHostAppearance(payload: { locale?: string; theme?: string }): void {
  try {
    const appearance = useAppearanceStore()
    if (payload.locale) {
      appearance.setLocale(toSupportLocale(payload.locale))
    }
    if (payload.theme) {
      appearance.setTheme(resolveTheme(payload.theme))
    }
  } catch {
    // Pinia may not be installed yet during isolated tests.
  }
}

export function applyHostInitRoute(
  initialRouteName: SemanticRouteName | undefined,
  currentPath: string,
  side: 'user' | 'staff' = 'user',
): void {
  if (currentPath.startsWith('/dev/') || isAdminInternalPath(currentPath)) {
    return
  }
  if (pendingEntry && isViewRouteName(pendingEntry.name)) {
    return
  }
  if (pendingEntry) {
    void navigateFromHost(
      { ...remapRouteForSide(pendingEntry, side), replace: true },
      { silent: false },
    )
    return
  }
  const resolved: SemanticRoute = {
    name: initialRouteName ?? (side === 'staff' ? 'ticket.list' : 'conversation.home'),
    replace: true,
  }
  const next = remapRouteForSide(resolved, side)
  if (!isViewRouteName(next.name)) {
    void navigateFromHost(next, { silent: false })
  }
}

export async function resolveEntryConversation(session: SessionManager): Promise<void> {
  if (entryResolved || !pendingEntry || !isViewRouteName(pendingEntry.name)) {
    return
  }
  const conversationId = pendingEntry.params?.conversationId
  if (!conversationId || !session.hasSession() || !session.isConnected()) {
    return
  }
  const usecases = peekSupportUseCases()
  if (!usecases) {
    return
  }
  entryResolved = true
  const conversation = await usecases.resolveConversation(conversationId)
  if (!conversation) {
    await navigateFromHost(
      { name: session.getSide() === 'staff' ? 'ticket.list' : 'conversation.home', replace: true },
      { silent: false },
    )
    return
  }
  const current = currentSemanticRoute()
  if (current?.params?.conversationId === conversation.id && isViewRouteName(current.name)) {
    return
  }
  const viewName = session.getSide() === 'staff' ? 'ticket.view' : pendingEntry.name
  await navigateFromHost(
    {
      name: viewName,
      params: { conversationId: conversation.id },
      replace: true,
    },
    { silent: false },
  )
}

export function applyCommandToApplication(command: HostCommand): void {
  switch (command.type) {
    case 'HOST_INIT':
      applyHostAppearance({
        locale: command.payload.locale,
        theme: command.payload.theme,
      })
      try {
        useUiStore().setSurface(command.payload.side === 'staff' ? 'ticket' : 'chat')
      } catch {
        // Pinia may not be installed yet.
      }
      applyHostInitRoute(
        command.payload.initialRoute.name,
        typeof window === 'undefined' ? '/' : window.location.hash.replace(/^#/, '') || '/',
        command.payload.side,
      )
      break
    case 'NAVIGATE': {
      const validated = validateSemanticRoute(command.payload)
      if (validated.ok) {
        let side: 'user' | 'staff' = 'user'
        try {
          side = useUiStore().surface === 'ticket' ? 'staff' : 'user'
        } catch {
          // Pinia may not be installed yet.
        }
        void navigateFromHost(remapRouteForSide(validated.route, side), { silent: true })
      }
      break
    }
    case 'LOCALE_SET':
      applyHostAppearance({ locale: command.payload.locale })
      break
    case 'THEME_SET':
      applyHostAppearance({ theme: command.payload.theme })
      break
    case 'HOST_FOREGROUND':
      setHostForeground(true)
      refetchActiveListAndThread(currentConversationId())
      break
    case 'HOST_BACKGROUND':
      setHostForeground(false)
      break
    case 'MODULE_OPEN':
      try {
        useUiStore().openDrawer()
      } catch {
        // Pinia may not be installed yet.
      }
      break
    case 'MODULE_CLOSE':
      try {
        useUiStore().closeDrawer()
      } catch {
        // Pinia may not be installed yet.
      }
      break
    case 'SESSION_CLEAR':
    case 'DISPOSE':
      setHostForeground(true)
      clearServerState()
      resetSessionSnapshot()
      entryResolved = false
      break
    default:
      break
  }
}

export function applyBackRequested(output: HandshakeOutput): HandshakeOutput {
  const handled = consumeModuleBack()
  return {
    events: output.events,
    results: output.results.map((result) => {
      if (result.type !== 'COMMAND_SUCCEEDED') {
        return result
      }
      return createEnvelope({
        instanceId: result.instanceId,
        type: 'COMMAND_SUCCEEDED',
        requestId: result.requestId,
        messageId: result.messageId,
        sentAt: result.sentAt,
        payload: { command: 'BACK_REQUESTED', handled },
      })
    }),
  }
}
