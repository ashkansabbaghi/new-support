/** Satisfies SESSION_SET schema without placing a token on the bridge. Cookie remains SoT. */
export const COOKIE_CREDENTIAL_PLACEHOLDER = 'cookie' as const

export const IFRAME_SANDBOX = 'allow-scripts allow-forms allow-same-origin' as const

export const DEFAULT_COMMAND_TIMEOUT_MS = 8_000
export const DEFAULT_HANDSHAKE_TIMEOUT_MS = 12_000

export const RESIZE_MIN = { width: 280, height: 240 } as const
export const RESIZE_MAX = { width: 720, height: 900 } as const
export const RESIZE_DEFAULT = { width: 380, height: 640 } as const
export const RESIZE_LAUNCHER = { width: 88, height: 88 } as const

export const HOST_ROOT_ID = 'nipoto-support-host-root'
export const HOST_STYLE_ID = 'nipoto-support-host-style'

export const WIDGET_ID_PATTERN = /^[A-Za-z0-9._-]+$/
export const LOCALE_PATTERN = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/
