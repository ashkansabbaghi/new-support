# Host / widget CSP examples

Static header files only — no new backend.

| File | Apply on | Purpose |
| --- | --- | --- |
| [host.headers](./host.headers) | Host page origin | `script-src` = loader CDN; `frame-src` = widget origin |
| [widget.headers](./widget.headers) | Widget iframe origin | `frame-ancestors` = host allowlist |

Rules:

1. Host: `script-src` includes the CDN that serves `loader.js`; `frame-src` includes the widget origin.
2. Widget: `frame-ancestors` is the domain allowlist (same policy as `widget-id`).
3. Do **not** send `X-Frame-Options: SAMEORIGIN` on the widget. It breaks cross-origin embed.
4. Iframe sandbox stays minimal: `allow-scripts allow-forms allow-same-origin` on a **separate** origin.

Local vanilla host (`http://localhost:4174`) framing `http://localhost:5173` needs `frame-ancestors` to include `http://localhost:4174` on the module preview if you enable CSP during acceptance.
