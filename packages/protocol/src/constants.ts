export const PROTOCOL_CHANNEL = 'nipoto.support' as const
export const PROTOCOL_VERSION = '1.0' as const
export const PROTOCOL_MAJOR = 1 as const
export const PROTOCOL_MIN_MINOR = 0 as const
export const PROTOCOL_MAX_MINOR = 0 as const

/** Max UTF-8 size of a serialized bridge envelope. Attachments must not travel on the bridge. */
export const MAX_ENVELOPE_BYTES = 64 * 1024

export const FORBIDDEN_BRIDGE_KEYS = [
  'attachment',
  'attachments',
  'file',
  'files',
  'blob',
  'blobs',
  'objectUrl',
  'objectURL',
  'mediaUrl',
  'html',
  'innerHTML',
  'script',
  'javascript',
  'selector',
  'css',
] as const

export const TOKEN_PARAM_KEYS = [
  'token',
  'access_token',
  'accessToken',
  'user-token',
  'staff-token',
  'authorization',
  'credential',
] as const

export const FORBIDDEN_HOST_COMMANDS = [
  'SEND_MESSAGE',
  'CONVEY_CHAT',
  'CLOSE_CHAT',
] as const

export const SENSITIVE_LOG_KEYS = [
  'token',
  'access_token',
  'accesstoken',
  'credential',
  'authorization',
  'password',
  'secret',
  'value',
  'text',
  'message',
  'body',
  'email',
  'mobile',
  'html',
] as const
