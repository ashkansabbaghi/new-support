# Vanilla host

Copy-pasteable HTML host. No Vue / Pinia / Tailwind from the Support app.

Local acceptance (RTL, dispose, session, schema): see [examples/README.md](../README.md).

```bash
yarn dev
yarn workspace @nipoto/support-loader example
```

Open http://localhost:4174

You must already be logged in on a same-site cookie domain (`user-token` / `staff-token`), or `AUTH_REQUIRED` is expected. The snippet only uses `data-widget-id` and `data-locale`.
