export {
  extractConversationId,
  isQueuedConversation,
  resolveOpenOutcome,
  toConversation,
  toConversationList,
  unwrapBackendList,
  type Conversation,
  type ConversationStatus,
  type ConversationSurface,
} from './conversation'
export {
  applyAvailabilityEvent,
  toDepartment,
  toDepartmentList,
  toFaq,
  toFaqList,
  toStaffAvailability,
  toStringList,
  type Department,
  type FaqItem,
  type StaffAvailability,
} from './catalog'
export { eventTouchesThread, mapBackendEventToDomain } from './events'
export {
  formatConversationDate,
  jalaliToGregorian,
  jalaliToGregorianIso,
  parseJalaliDateInput,
} from './jalali'
export {
  AVATAR_MAX_BYTES,
  ALLOWED_IMAGE_EXTENSIONS,
  FILE_ERROR_HEIC,
  FILE_ERROR_SIZE_LIMIT,
  FILE_ERROR_WRONG_TYPE,
  FileClientError,
  assertAllowedImage,
  fileErrorCode,
  isAllowedImageFile,
  isHeicFile,
} from './files'
export type { BrowserFileLike, FileClientErrorCode } from './files'
export {
  dateKeyFor,
  isOutgoingMessage,
  isSystemMessage,
  toChatMessage,
  toChatMessageList,
  toPlainText,
  withDateSeparators,
  type ChatMessage,
  type MessageListItem,
} from './message'
export {
  predeterminedCategories,
  toPredeterminedAnswer,
  toPredeterminedList,
  type PredeterminedAnswer,
} from './predetermined'
export { normalizeConversationStatus, statusI18nKey, UI_STATUSES } from './status'
export {
  canManageAvailability,
  canManageDepartments,
  canManageFaqs,
  canManagePredetermined,
  canUseStaffConsole,
  isStaffRole,
  isTicketListManager,
  mergeAvailabilityStaff,
  STAFF_ROLES,
  toConversationUser,
  toCount,
  toStaffMember,
  toStaffMemberList,
  toStaffProfile,
  type ConversationUser,
  type StaffMember,
  type StaffProfile,
  type StaffRole,
} from './staff'
export {
  buildTicketListQuery,
  TICKET_STATUS_VALUES,
  ticketListQueryReady,
  type TicketListActor,
  type TicketListFilterInput,
  type TicketStatusValue,
} from './ticketQuery'
export type { ConversationState, MappedDomainEvent } from './events'
export {
  CONVERSATION_ID_MAX_LENGTH,
  CONVERSATION_ID_PATTERN,
  SEMANTIC_ROUTE_NAMES,
  VIEW_ROUTE_NAMES,
  conversationIdFromRoute,
  isSemanticRouteName,
  isValidConversationId,
  isViewRouteName,
  remapRouteForSide,
  routesShareConversation,
  toNavigatePayload,
  validateSemanticRoute,
  viewRouteForConversation,
  type SemanticRoute,
  type SemanticRouteName,
  type SemanticRouteParams,
  type SemanticRouteValidation,
  type ViewRouteName,
} from './routes'
