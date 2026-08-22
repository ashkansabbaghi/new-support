# @nipoto/support-web-sdk

Framework-free host adapter: iframe, exact origin, protocol 1.0 handshake, and MessageChannel (ARCHITECTURE §6).

No domain client, `$app`, Vue, Pinia, or Tailwind. The Support UI stays inside `apps/module`.

## Public API

```ts
import { createSupportClient } from '@nipoto/support-web-sdk'

const client = createSupportClient({
  origin: 'http://localhost:5173',
  widgetId: 'wid_public_example',
  locale: 'fa-IR',
})

client.on('ready', () => {
  /* MODULE_READY — schema, nonce, origin/source validated */
})

await client.ready // HOST_INIT completed
await client.setSession() // generation bump only; cookie is the credential
await client.open()
await client.close()
await client.dispose()
```

`setSession` never treats a token as the credential. `SESSION_SET.credential.value` is the placeholder `cookie`. The module reads `user-token` / `staff-token` from its own cookie jar.

`<nipoto-support-module>` is an optional wrapper of the same iframe. It does not copy UI into the host DOM or Shadow DOM.

Deep links (`buildDeepLinkUrl`) are fallback only and must not carry tokens or PII.

## Tests

```bash
yarn workspace @nipoto/support-web-sdk test
yarn workspace @nipoto/support-web-sdk typecheck
```
