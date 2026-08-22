/**
 * Phase 3 kept a bearer from SESSION_SET in memory. Phase 4: the host cookie is
 * the credential. Session lifecycle lives in SessionManager (`@nipoto/support-sdk`).
 */
export { getSessionManager } from '../gateway/runtime'
export type { SessionManager, SessionSnapshot } from '@nipoto/support-sdk'
