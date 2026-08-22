/**
 * Application layer for Phase 7 (user widget) and later staff console.
 *
 * Use cases talk to SupportGateway. TanStack Query owns server lists/history.
 * Pinia stays client-only (drawer / locale / theme). Credentials stay in SessionManager.
 */
export {
  handleIncomingDomainEvent,
  queryKeysForDomainEvent,
  type DomainEventHandler,
} from './events'
export { supportQueryClient, createSupportQueryClient } from './queryClient'
export { queryKeys, conversationDetailKeyForRoute } from './queryKeys'
export {
  useActiveConversations,
  useAdminDepartments,
  useAdminFaqs,
  useAvailabilityStaff,
  useAvailableStaff,
  useCloseConversationMutation,
  useClosedConversations,
  useConversation,
  useConversationCount,
  useConversationList,
  useConversationMessages,
  useConversationUser,
  useConveyConversationMutation,
  useCreateDepartmentMutation,
  useCreateFaqMutation,
  useCreatePredeterminedMutation,
  useCurrentStaff,
  useDeleteDepartmentMutation,
  useDeleteFaqMutation,
  useDeletePredeterminedMutation,
  useDepartmentCount,
  useDepartments,
  useFaqCount,
  useFaqTags,
  useFaqs,
  useMarkSeenMutation,
  useOpenConversationCount,
  useOpenConversationMutation,
  useOpenConversations,
  usePredeterminedCategories,
  usePredeterminedCount,
  usePredeterminedList,
  useProcessConversationMutation,
  useQueuedConversations,
  useReopenConversationMutation,
  useSendFileMutation,
  useSendTextMutation,
  useSupportFile,
  useUploadAvatarMutation,
  useSetAvailableMutation,
  useSetUnavailableMutation,
  useStaffList,
  useUpdateDepartmentMutation,
  useUpdateFaqMutation,
  useUpdatePredeterminedMutation,
} from './queries'
export { clearServerState, invalidateDomainEventKeys, refetchActiveListAndThread } from './reconcile'
export {
  requestExternalNavigation,
  setExternalNavigationSink,
  type ExternalNavTarget,
} from './externalNavigation'
export { bindSupportUseCases, getSupportUseCases, peekSupportUseCases, setSupportUseCases } from './runtime'
export {
  isPresentationReady,
  isSessionReady,
  resetSessionSnapshot,
  syncSessionSnapshot,
  usePresentationReady,
  useSessionReady,
} from './sessionState'
export {
  createFixtureUseCases,
  FIXTURE_IDS,
  isFixtureMode,
  resetFixtureState,
  setFixtureMode,
  setFixtureStaffRoles,
  useFixtureMode,
} from './fixtures'
export {
  isHostForeground,
  notificationForDomainEvent,
  reportConversationState,
  reportUnreadCount,
  requestHostNotification,
  requestHostResize,
  setConversationStateSink,
  setHostForeground,
  setNotificationSink,
  setResizeSink,
  setUnreadCountSink,
} from './hostSignals'
export { StaleSessionError, assertCurrentGeneration, shouldAcceptSessionEvent } from './sessionGuard'
export { ClosedConversationError, createSupportUseCases } from './usecases'
export type {
  ConversationUserInput,
  ConveyInput,
  DepartmentPageInput,
  DepartmentWriteInput,
  FaqListInput,
  FaqWriteInput,
  GetMessagesInput,
  ListPage,
  MarkSeenInput,
  OpenConversationInput,
  PredeterminedWriteInput,
  SendFileInput,
  SendTextInput,
  SupportFileQuery,
  SupportUseCases,
  UploadAvatarFileInput,
  UseCaseDeps,
} from './usecases'
export { fileErrorCode } from '@/domain'
