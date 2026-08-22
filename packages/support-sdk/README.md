# @nipoto/support-sdk

Typed `SupportGateway` over the existing `$app.Support.*` / ABR client (ARCHITECTURE §5, ADR-003/004/006/007).

No `Support.Ticket` aggregate and no NestJS / Ticket REST API.

## How `$app` is created

1. Resolve an allowlisted backend (`resolveBackend`).
2. `import Abr, { Auth } from '@abr/client'` (0.0.3), same as staff / website / user-panel.
3. Set `Auth.cookieName` to `user-token` (`side=user`) or `staff-token` (`side=staff`).
4. Cookie attributes: localhost is host-only + `secure=false`; deployed uses `domain=.{base}` + `secure` + `SameSite=Lax`.
5. `await Abr(wsUrl)`. `sendToken` reads the cookie and sends `token.split(' ')[1]`.

Login is **not** in this app. The user authenticates on the user or staff host, then returns with a cookie.

## SESSION_SET / cookies

`SESSION_SET` is **not** the V1 credential. The host only signals that a session exists and bumps `generation`. If the payload includes `credential.value`, it is ignored and never written to memory stores, `localStorage`, `sessionStorage`, IndexedDB, URL, Pinia, or logs.

The same-site cookie is the credential (user-confirmed). Third-party iframe cookies (Safari / ITP) are a known later risk (ADR-003); this package does not fake programmatic token injection.

Refresh: a higher-generation `SESSION_SET` tears down the old ABR connection and reconnects by reading the cookie again.

## SESSION_CLEAR

Disconnects ABR (and suppresses `@abr/client` auto-reconnect), drops subscriptions, in-memory cache, and object URLs, then bumps generation so late events are ignored.

**Host cookies are not deleted.** `user-token` / `staff-token` belong to the user/staff hosts. `@abr/client` may still remove a cookie itself if `sendToken` fails (`tokenRemoved`); this SDK does not call `Auth.removeToken()` on clear.

`401` / `tokenRemoved` emit `AUTH_REQUIRED` once per generation. No retry loop.

## Environment

- Localhost only: `ABR_URL` / `ABR_WS_URL` (default `b1-back.nipoto.pro` / `wss://b1-back.nipoto.pro`). Hosts are allowlisted (`b1`, `b5`, `stage2`, `back.nipoto.com`, numbered `{id}-back.nipoto.{pro|com}`).
- Deploy: sibling `back` from the frontend hostname (same rules as `resolveBackHost.js`). Arbitrary backend URLs are rejected.

## Tests

```bash
yarn workspace @nipoto/support-sdk test
yarn workspace @nipoto/support-sdk typecheck
```
