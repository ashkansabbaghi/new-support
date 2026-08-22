export { createAbrApp, configureAbrAuth, disconnectAbrApp } from './abr/createAbrApp.js'
export type { CreateAbrAppOptions } from './abr/createAbrApp.js'
export type { SupportApp, AbrAggregate, AbrCommand, AbrList, AbrSubscription } from './app.js'
export { getAuthToken, hasAuthCookie, parseCookie, readDocumentCookie } from './auth/cookies.js'
export { createObjectUrlRegistry } from './cache/ObjectUrlRegistry.js'
export {
  LOCAL_DEFAULT_BACK_HOST,
  isAllowedBackHost,
  isLocalHostname,
  parseConfiguredHost,
  resolveBackend,
  resolveBackHost,
  resolveBackUrl,
  resolveSocketUrl,
  siblingHost,
} from './env/resolveBackend.js'
export type { BackendEnvInput, ResolvedBackend } from './env/resolveBackend.js'
export {
  LOCAL_STAFF_LOGIN_URL,
  LOCAL_USER_LOGIN_URL,
  resolveLoginUrl,
} from './env/loginUrl.js'
export { createSupportGateway } from './gateway/SupportGateway.js'
export type { SupportGateway, SupportGatewayOptions } from './gateway/SupportGateway.js'
export {
  UPLOAD_ERROR_SIZE_LIMIT,
  UPLOAD_ERROR_WRONG_TYPE,
  UploadRequestError,
} from './gateway/upload.js'
export type {
  ChatListFilter,
  ConversationQuery,
  MutationAttempt,
  OpenChatInput,
  Pagination,
  UploadAvatarInput,
  UploadFileInput,
} from './gateway/types.js'
export {
  ABR_NOTIFICATION_TYPES,
  BACKEND_CHAT_EVENTS,
  isKnownBackendEvent,
  mapUserNotification,
} from './realtime/events.js'
export type { AbrNotificationType, BackendChatEvent, DomainEvent } from './realtime/events.js'
export { createMutationLedger, mutationAttemptKey } from './realtime/MutationLedger.js'
export type { MutationLedger } from './realtime/MutationLedger.js'
export { createSubscriptionRegistry, subscriptionKey } from './realtime/SubscriptionRegistry.js'
export { createSessionManager, isAuthFailure } from './session/SessionManager.js'
export type {
  AuthRequiredReason,
  ConnectApp,
  HostSessionSetPayload,
  SessionManager,
  SessionManagerHooks,
  SessionManagerOptions,
  SessionSnapshot,
} from './session/SessionManager.js'
export {
  STAFF_TOKEN_COOKIE,
  USER_TOKEN_COOKIE,
  cookieNameForSide,
  inferSideFromHostname,
} from './side.js'
export type { AuthCookieName, SupportSide } from './side.js'
