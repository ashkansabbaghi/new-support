# Support module tokens

Tokens live in this document (the iframe SPA). The host must not inject CSS or HTML. Theming later is only via `HOST_INIT` / `THEME_SET` / `LOCALE_SET` (locale, direction, theme) — not arbitrary host styles.

Source of truth: `--support-*` in `main.css`. Tailwind utilities (`bg-support-primary`, `text-primary`, …) and shadcn-vue aliases (`--primary`, `--background`, …) only point at these variables.

## Color

| Token | Light (widget) | Role |
| --- | --- | --- |
| `--support-color-primary` | `#ff4d42` | Brand / buttons (ChatHead) |
| `--support-color-primary-hover` | `#fe6161` | Hover / sent gradient end |
| `--support-color-primary-soft` | `#ff7269` | Avatar fill |
| `--support-color-primary-foreground` | `#ffffff` | Text on primary |
| `--support-color-primary-shadow` | `#ffd5c9` | `primary-shadow` buttons |
| `--support-color-header` | `#ff4d42` / dark `#262837` | Widget chrome |
| `--support-color-background` | `#ffffff` / dark `#1d202c` | Document surface |
| `--support-color-surface` | `#ffffff` / dark `#262837` | Cards, popovers, footer |
| `--support-color-foreground` | `#1c1b1b` | Body text |
| `--support-color-muted` | `#5c6370` | Captions (contrast-tuned) |
| `--support-color-border` | `#d5d9e2` | Hairlines / inputs |
| `--support-color-online` | `#38eeb7` | Presence |
| `--support-color-success` | `#48e5cc` | Queue / success chip |
| `--support-color-danger` | `#de2e57` | Seen check / destructive |
| `--support-color-incoming` | `#64b5f6` | Received bubble (`$blue-4`) |
| `--support-color-sent-start` / `--support-color-sent-end` | `#ff8d74` / `#fe6161` | Sent bubble gradient |
| `--support-gradient-sent` | widget 355.24° gradient | Sent message fill |

Dark theme follows the current widget: header and panels shift to `#262837` / `#1d202c`, primary softens to `#ff7269`.

## Shape, type, elevation

| Token | Value | Role |
| --- | --- | --- |
| `--support-radius` | `10px` | Bubbles, controls |
| `--support-radius-chip` | `5px` | Status chips |
| `--support-radius-card` | `25px` | Widget card top |
| `--support-size-header` | `80px` | Chat head |
| `--support-size-composer` | `80px` | Input bar |
| `--support-shadow-primary` | `0 4px 7px 0 …` | Primary CTA |
| `--support-shadow-card` | widget card glow | Floating panel |
| `--support-font-sans` | Tahoma / system | Persian-capable fallback until a module font is owned |

## Viewport (CSS hooks only)

Set on `:root` from `env(safe-area-inset-*)` and, at runtime, `visualViewport` via `bindVisualViewportCssVars`:

- `--support-safe-top|right|bottom|left`
- `--support-vv-width`, `--support-vv-height`, `--support-vv-offset-top`, `--support-vv-offset-left`

Helpers: `.support-safe-pad`, `.support-vv-height`, `.support-vv-min-height`. No ChatLayout logic yet.

## Baseline a11y

- `dir` / `lang` / `.dark` / `color-scheme` on `<html>` from the appearance store (kitchen toggle now; `HOST_INIT` later).
- Focus rings use `--support-color-ring`.
- `prefers-contrast: more` darkens/lightens primary and borders in-family.
- `prefers-reduced-motion: reduce` collapses animation/transition duration.

## Tailwind

Examples: `bg-support-header`, `text-support-foreground`, `bg-primary`, `shadow-support-primary`, `rounded-support`, `pt-support-safe-t`, `min-h-support-vv` is not generated — use `.support-vv-min-height` or `min-h-[var(--support-vv-height)]`.
