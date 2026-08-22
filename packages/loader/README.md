# @nipoto/support-loader

Small CDN `loader.js` (esbuild, no runtime dependencies). Creates the Support iframe and speaks protocol 1.0. Compatible with the current and previous protocol minor of the same major.

## Public API

`init`, `open`, `close`, `setSession`, `destroy`, plus lifecycle events (`ready`, `initialized`, `opened`, `closed`, `disposed`, `auth-required`, `error`, …).

```html
<script
  src="/loader.js"
  data-widget-id="wid_public_example"
  data-locale="fa-IR"
  async
></script>
```

`widget-id` is a public tenant id, not a secret. Do not put tokens in the snippet or URL.

`setSession` only bumps session generation. The iframe reads `user-token` / `staff-token` from its cookie jar. Without a cookie, `AUTH_REQUIRED` is expected.

## Local vanilla host

```bash
# terminal 1 — module origin
yarn dev

# terminal 2 — build loader (origin defaults to http://localhost:5173) and serve the example
yarn workspace @nipoto/support-loader example
```

Open http://localhost:4174

Override the baked iframe origin: `NIPOTO_MODULE_ORIGIN=http://localhost:5173 yarn workspace @nipoto/support-loader build`
