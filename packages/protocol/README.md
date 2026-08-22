# @nipoto/support-protocol

Versioned host↔module protocol. JSON Schema Draft 2020-12 in `schemas/1.0` is the source of truth (ARCHITECTURE §6, ADR-005). Types in `src/generated/types.ts` are generated from those schemas.

## Envelope

`channel`, `protocolVersion`, `instanceId`, `messageId`, `requestId`, `type`, `sentAt`, `payload`.

Channel is `nipoto.support`. V1 protocol version is `1.0`. Max serialized envelope size is 64 KiB. Attachments, HTML, raw URLs, and credentials in URLs are rejected.

## Commands and events

Host → module: `HOST_INIT`, `SESSION_SET`, `SESSION_CLEAR`, `MODULE_OPEN`, `MODULE_CLOSE`, `NAVIGATE`, `LOCALE_SET`, `THEME_SET`, `HOST_FOREGROUND`, `HOST_BACKGROUND`, `NETWORK_STATUS_CHANGED`, `BACK_REQUESTED`, `DISPOSE`.

Module → host: `MODULE_READY`, `MODULE_INITIALIZED`, `MODULE_OPENED`, `MODULE_CLOSED`, `ROUTE_CHANGED`, `UNREAD_COUNT_CHANGED`, `CONVERSATION_STATE_CHANGED`, `EXTERNAL_NAVIGATION_REQUESTED`, `NOTIFICATION_REQUESTED`, `AUTH_REQUIRED`, `MODULE_ERROR`, `MODULE_DISPOSED`.

Results: `COMMAND_SUCCEEDED` | `COMMAND_FAILED` `{ code, category, retryable, correlationId }`.

Unknown required capabilities fail with `UNSUPPORTED_CAPABILITY`. Domain commands such as `SEND_MESSAGE` / `CONVEY_CHAT` are out of schema.

## Scripts

```bash
yarn workspace @nipoto/support-protocol generate
yarn workspace @nipoto/support-protocol test
yarn workspace @nipoto/support-protocol typecheck
```
