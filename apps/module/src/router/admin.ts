/**
 * Module-internal staff admin paths.
 * Not host protocol names — hosts keep using ticket.* / conversation.*.
 */
export const ADMIN_PATHS = {
  departments: '/departments',
  faqs: '/faqs',
  predetermined: '/predetermined-answer',
  staffs: '/staffs-list',
} as const

export type AdminPath = (typeof ADMIN_PATHS)[keyof typeof ADMIN_PATHS]

const ADMIN_PATH_VALUES = new Set<string>(Object.values(ADMIN_PATHS))

export function isAdminInternalPath(path: string): boolean {
  const withoutHash = path.startsWith('#') ? path.slice(1) : path
  const withoutQuery = withoutHash.split('?')[0] ?? ''
  const normalized = withoutQuery.replace(/\/+$/, '') || '/'
  return ADMIN_PATH_VALUES.has(normalized)
}
