# Embed examples and local acceptance

Phases 1–10 already ship the product UI. This folder is host-side only: snippet, CSP, release metadata, and the rows of the [DELIVERY](../docs/DELIVERY_AND_EMBED.md) acceptance matrix that can be run locally.

The loader stays compatible with the **current and previous protocol minor of the same major**. Hosts bind to **protocol major + channel** (`examples/releases/v1/{internal,canary,stable}.json`), not a mutable filename like `loader-latest.js`.

## Layout

| Path | What |
| --- | --- |
| [vanilla-host/](./vanilla-host/) | HTML host (no Vue / Pinia / Tailwind from the app) |
| [react-host/App.tsx](./react-host/App.tsx) | Thin React wrapper around `createSupportClient` |
| [vue-host/App.vue](./vue-host/App.vue) | Thin Vue wrapper around `createSupportClient` |
| [csp/](./csp/) | Example `script-src` / `frame-src` / `frame-ancestors` headers |
| [releases/v1/](./releases/v1/) | Static channel manifests (`internal`, `canary`, `stable`) |

WordPress plugin, NestJS, native SDKs, Service Worker, and a production CDN are out of scope here.

## Run the hosts

```bash
# terminal 1 — widget origin
yarn dev

# terminal 2 — loader + vanilla HTML host
yarn workspace @nipoto/support-loader example
```

Open http://localhost:4174

You must already be logged in on a same-site cookie domain (`user-token` / `staff-token`), or `AUTH_REQUIRED` is expected. The snippet only uses public `data-widget-id` and `data-locale`. Tokens must not appear in the URL or `localStorage`.

React / Vue files are copy-paste SDK usage. They are not a second app workspace.

## Local acceptance checklist

Rows from DELIVERY §10 that this repo can exercise without WordPress, Safari device labs, or a real CDN.

### HTML host

- [ ] Vanilla page at http://localhost:4174 has **zero** Vue / Pinia / Tailwind from `apps/module`.
- [ ] Snippet is `data-widget-id` + `data-locale` only (see `vanilla-host/index.html`).
- [ ] `setSession` then `open` shows the widget iframe from `http://localhost:5173`.

### RTL

- [ ] Loader `data-locale="fa-IR"` (default on the vanilla host).
- [ ] After `open`, the iframe UI is RTL (`direction=rtl` from `HOST_INIT`).
- [ ] Optional: call `navigate({ name: 'conversation.home' })` and confirm layout stays RTL.

### Dispose (no host leftovers)

- [ ] `open`, then **destroy**.
- [ ] Host DOM has no `#nipoto-support-host-root` and no `#nipoto-support-host-style`.
- [ ] No leftover `message` / `online` / `offline` / `visibilitychange` listeners from the SDK (DevTools → Event Listeners).
- [ ] Automated proof: `yarn workspace @nipoto/support-web-sdk test` (`dispose-host` + client dispose).

### Session clear

- [ ] `setSession`, `open`, then have the host send `SESSION_CLEAR` / start a new generation (destroy + `setSession` again).
- [ ] Widget returns to a no-session state; late events from the old generation are ignored.
- [ ] Cookie on the host / cookie domain is **not** deleted by the module.
- [ ] Automated: `yarn workspace @nipoto/support-sdk test` and `yarn workspace @nipoto/support-module test` (session generation).

### Schema rejection

- [ ] Unknown command (`RESIZE_WIDGET`, `SEND_MESSAGE`) is rejected (`UNKNOWN_TYPE`).
- [ ] Attachment / HTML / token-in-params on the bridge is rejected.
- [ ] Envelope over 64 KiB is rejected (`ENVELOPE_TOO_LARGE`).
- [ ] Automated: `yarn workspace @nipoto/support-protocol test`, `yarn workspace @nipoto/support-web-sdk test`, `yarn workspace @nipoto/support-module test` (`bridge-contract`).

### Reconnect (no duplicate send / subscription)

- [ ] Automated: `yarn workspace @nipoto/support-sdk test` (`reconnect.test.ts`).
- [ ] Same `instanceId + key` does not create a second subscription.
- [ ] Retry after a backend ack does not send again; retry is allowed only when the ack is missing.
- [ ] No offline mutation queue.

### Security smoke (CI)

- [ ] `yarn test` runs `scripts/security-smoke.mjs`.
- [ ] Fails if a token is written to `localStorage` / `sessionStorage` / IndexedDB in `apps/`, `packages/`, or `examples/`, or appears in an example URL.

### CSP (static headers, optional local)

- [ ] Read [csp/README.md](./csp/README.md). Host: `script-src` CDN + `frame-src` widget. Widget: `frame-ancestors` allowlist.
- [ ] Confirm you are **not** sending `X-Frame-Options: SAMEORIGIN` on the widget origin.

### Version / channel (no live CDN)

- [ ] Host would fetch `examples/releases/v1/{channel}.json` (protocol major `v1` + channel), not a mutable `latest` filename.
- [ ] Integrity fields are placeholders until a real pin + SRI build exists.
- [ ] Loader remains compatible with the previous protocol minor of the same major.

### Not run locally here

Safari / third-party-cookie blocked, WordPress, mobile file picker, staff console on a phone viewport, production rollback against a real CDN. Product UI for those lives in `apps/module` from earlier phases.
