# Nipoto Support

Standalone Support module (iframe SPA). This is a Phase 1 workspace scaffold: product chat, auth, and `$app` are not implemented yet.

Read [docs/ONBOARDING.md](./docs/ONBOARDING.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) before adding features.

## Requirements

- Node.js 24 (current Active LTS) — see `.nvmrc`
- Yarn 4.9.2 (Corepack)

```bash
nvm use
corepack enable
```

## Run the module only

```bash
yarn install
yarn dev
```

Vite serves `apps/module` (typically `http://localhost:5173`). Routing uses **hash history** (`#/`). There is no Service Worker.

```bash
yarn build      # content-hashed assets in apps/module/dist
yarn preview    # serve the production build
yarn typecheck
yarn lint
```

## Scripts

| Script | What it does |
| --- | --- |
| `yarn dev` | Dev server for the iframe SPA |
| `yarn build` | Production Vite build (hashed filenames) |
| `yarn preview` | Preview the production build |
| `yarn typecheck` | `vue-tsc --noEmit` for `apps/module` |
| `yarn lint` | ESLint (flat config, Vue + TypeScript) |
| `yarn changeset` | Add a Changeset for workspace packages |

## Workspace

| Path | Package | Phase 1 |
| --- | --- | --- |
| `apps/module` | `@nipoto/support-module` | Placeholder Vue 3 SPA |
| `packages/protocol` | `@nipoto/support-protocol` | Empty scaffold |
| `packages/web-sdk` | `@nipoto/support-web-sdk` | Empty scaffold |
| `packages/support-sdk` | `@nipoto/support-sdk` | Empty scaffold |
| `packages/loader` | `@nipoto/support-loader` | Empty scaffold |
| `examples/vanilla-host` | — | Placeholder HTML |

Sibling repos `../support` and `../staff` are reference-only. Do not import their source into this repo.
# new-support
