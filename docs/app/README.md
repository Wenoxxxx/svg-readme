# App

React 19 + TypeScript + Vite 8 frontend for svg-readme. This is the deployable
unit: `app/` is the Vercel root directory (or the target of the root-level
`vercel.json` build overrides).

## Scripts

```bash
npm ci                  # install (from app/)
npm run dev             # Vite dev server
npm run build           # tsc -b + vite build → dist/
npm run preview         # serve dist/ locally
npm run test            # Vitest (704 tests)
npm run lint            # ESLint
```

## Layout

```
src/
  pages/landing/      Home (Quick Studio), About, Contacts + components/lib
  pages/editor/       EditorInner and its hooks
  pages/NotFound.tsx  404 fallback route
  components/         TopNav, TopToolbar, editor canvas/sidebar/right bar, UI
  layouts/            LandingLayout, EditorLayout
  lib/                export, design file, geometry, templates, SVG import
  assets/fonts/woff2/ Poppins + JetBrains Mono (only the weights used)
  __tests__/          Vitest suites
public/               logo, robots.txt, sitemap.xml
```

## Build notes

- `/editor` is lazy-loaded, so the landing page does not ship the editor bundle.
- Fonts are WOFF2 only (7 faces). `lib/fontEmbed.ts` reuses the same files to
  embed `@font-face` data URLs into PNG/GIF exports.
- `vercel.json` adds the SPA rewrite plus cache/security headers. The root
  `vercel.json` mirrors the build settings for deployments rooted at the repo.

## Environment

| Variable | Purpose | Default |
|---|---|---|
| `VITE_CONTACT_EMAIL` | Inbox behind the `/contacts` mailto form | `hello@example.com` |

Copy `.env.example` to `.env.local` before deploying if you want the contact
form to reach a real inbox.

## Related docs

- [Feature index](./index.md)
- [Text tool](./text-tool.md) · [Move tool](./move-tool.md) · [Multi-select](./multi-select.md)
- [Testing](./testing.md)
