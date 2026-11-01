# svg-readme

Design animated SVG banners for your GitHub profile README, in the browser. Type a handle + tagline, pick an accent and motion, export real animated SVG with keyframes baked in — or open the full editor for layers, templates, and frame-accurate export.

No backend. No database. Designs live in local `.svg-readme.json` files + browser localStorage.

## Features

- **Quick Studio (landing page)** — configure handle, tagline, accent color, font, motion, theme, gradient wash, and size with a live SVG preview. Download `banner.svg`, copy the embed Markdown / SVG, randomize, reset, or hand off to the full editor.
- **Full editor (`/editor`)** — Figma-like canvas: move, hand, text, frame, pen (paths + vertex editing), shapes (rect / circle / triangle / star / hexagon / line), image, and paint bucket tools, with multi-select, undo/redo, copy/paste, grid + snapping, zoom/pan, and layer panel.
- **Template kits** — animated components that *append* (Profile Hero, Project Showcase, Stats Strip) and animated backgrounds that *replace the bg group* (Gradient Drift, Floating Blobs, Wave Sweep, Dot Grid Pulse, Grid Parallax, Grid Lines Parallax), with primary/accent color and 0.5×/1×/2× speed options.
- **Local-first persistence** — work autosaves to browser localStorage with a dirty indicator; Save downloads a `.svg-readme.json` design file, Open validates + replaces the document.
- **Export** — static SVG/PNG plus animated GIF (or individual PNG frames) captured from the animation timeline, so canvas preview and output stay in sync.

## Tech Stack

| Layer | Tool |
|---|---|
| UI | React 19, React Router 7 (`/` landing, `/about`, `/contacts`, `/editor`) |
| Build | Vite 8, TypeScript ~6 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), `tailwind-scrollbar`, OJ branding preset (`oj-branding-preset`) + `app/tokens/design_tokens.json` (light/dark) |
| Fonts | Poppins + JetBrains Mono, WOFF2 only (7 faces, ~314 kB total) |
| Icons | `lucide-react` + `@phosphor-icons/react` |
| State | React context (`EditorContext`), localStorage + sessionStorage handoff (no server) |
| SVG / export | Hand-built SVG string builders (`lib/export/buildSvg`, `animatedExport`), keyframe animations (transform/opacity only, export-safe) |
| Test / lint | Vitest 4 + Testing Library + jsdom, ESLint 10 |
| Deploy | Vercel (`app/vercel.json` SPA rewrite to `index.html`) |

## Project Structure

```
svg-readme/
├── app/                          # React frontend
│   ├── vercel.json               # SPA rewrite (all routes → index.html)
│   ├── tokens/design_tokens.json # Light/dark design tokens
│   └── src/
│       ├── pages/landing/        # Home Quick Studio, About, Contacts
│       │   ├── Home.tsx          # Studio state + download/copy/handoff actions
│       │   ├── components/       # Hero, StudioControls, StudioPreview, Features, HowItWorks, LandingFooter
│       │   └── lib/              # quickBanner.ts (SVG builder), quickHandoff.ts (editor handoff)
│       ├── pages/editor/         # EditorInner + hooks (history, clipboard, export, persistence,
│       │                         # path vertex editing, component insert, shortcuts, layers, SVG import)
│       ├── lib/templates/        # animatedComponents.ts (3 kits), backgroundAnimations.ts (6 bgs),
│       │                         # templatePrimitives.ts (shared layer/prop builders, palette + pace helpers)
│       ├── lib/                  # designFile.ts (v1 schema), export/, editor/, color, importSvg
│       ├── components/           # TopNav, TopToolbar (incl. Templates flyout), editor-canvas,
│       │                         # editor-sidebar, EditorRightBar (Design / Animate / Export tabs)
│       ├── layouts/              # LandingLayout, EditorLayout
│       └── __tests__/            # Vitest suites (editor, templates, quick banner, export, …)
├── docs/                         # Guides hub (docs/README.md) + app feature docs (docs/app/)
└── package.json                  # Root scripts (dev, install:all)
```

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm

### Setup

```bash
git clone https://github.com/Wenoxxxx/svg-readme.git
cd svg-readme
npm run install:all   # installs app/ dependencies
```

### Commands

```bash
npm run dev                  # Vite dev server from repo root
npm run build                # Type-check (tsc -b) + production build
npm run preview              # Preview the production build
npm run test                 # Vitest suite (use --pool=threads on Windows; forks pool can time out)
npm run lint                 # ESLint
```

Root scripts proxy to `app/`; running the same commands inside `app/` works too.

## Usage

### A. Quick Studio (fastest path)

1. Open `/` and scroll to the studio (`/#studio`).
2. Fill in **Content** — name/handle (max 28 chars) and tagline (max 60 chars).
3. Pick an **accent color** (6 swatches or custom picker), **font** (Mono / Sans / Display), and **motion** (Fade cascade / Gradient sweep / Rise / Typewriter).
4. Choose **Style** (Light / Dark + optional accent gradient wash) and **Size** (800×200 Standard, 1000×220 Wide, 640×160 Compact).
5. Use **Shuffle 🎲** to randomize or **Reset** to restore defaults; the preview updates live.
6. Export from the preview panel:
   - **Download** → `banner.svg`
   - **Copy Markdown** → `![banner](./banner.svg)`
   - **Copy SVG** → raw markup for pasting anywhere
   - **Open in Editor** → hands the config to `/editor` via sessionStorage and rebuilds it as editable Handle/Tagline layers
7. Reference the file in your profile README:

```md
<img src="https://raw.githubusercontent.com/yourname/yourname/main/output/banner.svg" width="100%" />
```

### B. Full editor

1. Open `/editor` directly, or via **Full Editor →** in the top nav / **Open in Editor** from the studio.
2. Tools (top toolbar + shortcuts): **Move, Hand, Text, Frame, Pen, Shape** (rect/circle/triangle/star/hexagon/line flyout), **Image, Paint bucket**. Right-side tabs mirror **Design / Animate / Export**.
3. **Templates** flyout:
   - *Animated components* → **append** on top and select the new group: Profile Hero, Project Showcase, Stats Strip.
   - *Animated backgrounds* → **replace** the existing `bg-` group (foreground kept): Gradient Drift, Floating Blobs, Wave Sweep, Dot Grid Pulse, Grid Parallax, Grid Lines Parallax. Set Primary / Accent / Speed (0.5×, 1×, 2×) before inserting; groups stay unlocked and editable.
4. **Save** (navbar button or `Ctrl+S`/`Cmd+S`) downloads a `{name}.svg-readme.json` design file.
5. **Open** (navbar button, or drag-drop a file onto the canvas) validates the file and **replaces** the current document. Drag-dropping an `.svg` file instead **appends** its layers to the canvas.
6. Work in progress autosaves to browser localStorage; the navbar dot flags unsaved changes, and leaving with unsaved work prompts for confirmation.

### Export guide

- **SVG** — vector output with CSS keyframes baked in; best for GitHub profile READMEs.
- **PNG** — static raster snapshot of the current frame.
- **GIF / PNG frames** — the Export tab captures each animation frame and writes a GIF (or individual PNGs), keeping canvas preview and output in sync. Only transform/opacity keyframes are used in templates so all three outputs match.

## Design File Format

`.svg-readme.json` (v1 schema, see `app/src/lib/designFile.ts`):

```json
{
  "version": 1,
  "kind": "svg-readme-design",
  "name": "Untitled",
  "frameSize": { "width": 800, "height": 200 },
  "layers": [{ "id": "...", "name": "...", "type": "text|shape|image|group", "...": "..." }],
  "elementProperties": { "<layerId>": { "type": "text|shape|image|path", "...": "..." } },
  "exportedAt": "ISO timestamp",
  "appVersion": "optional"
}
```

- Invalid files (bad JSON, wrong version, bad `frameSize`, duplicate layer ids, unknown element types) are rejected with an error; `elementProperties` entries with no matching layer are dropped.
- Plain `.json` is also accepted on import; the canonical extension is `.svg-readme.json`.
- Images embed as data URLs, so image-heavy designs produce large JSON files — keep source images small.

## Docs & Testing

- Guides hub: [`docs/README.md`](./docs/README.md) — persistence model and project map.
- Feature docs: [`docs/app/`](./docs/app/index.md) — text tool, move tool, multi-select.
- Testing: [`docs/app/testing.md`](./docs/app/testing.md) — Vitest setup and coverage; run with `cd app && npm run test` (`--pool=threads` on Windows).

## Deployment

- Vercel, SPA rewrite in `app/vercel.json` so `/editor`, `/about`, `/contacts`, and unknown routes resolve through `index.html` (which renders the 404 route). The same file adds immutable caching for hashed `/assets/*` and no-cache for `index.html`, plus `nosniff` / `Referrer-Policy` / `X-Frame-Options`.
- Two supported setups:
  - Set the Vercel **Root Directory** to `app` (uses `app/vercel.json`), or
  - Leave the root at the repo (uses the root `vercel.json` install/build/output overrides).
- Build locally with `npm run build` from the repo root (delegates to `app/`).
- Set `VITE_CONTACT_EMAIL` in the Vercel project if the `/contacts` form should reach a real inbox (see `app/.env.example`).
- Canonical/OG URLs in `app/index.html`, `public/robots.txt`, and `public/sitemap.xml` point at `https://svg-readme.vercel.app` — update them if the domain changes.
- Node ≥ 22.12 (`.nvmrc`, `engines`); CI runs lint, typecheck, tests, and build on PRs and pushes to `main`.
- Full step-by-step guide (both root layouts, env vars, smoke test, troubleshooting, rollback, alternate hosts): [`docs/deployment.md`](./docs/deployment.md).

## Roadmap

- [x] Local design files (import/export JSON, no backend)
- [x] Export to SVG / PNG / GIF (+ PNG frames)
- [x] Landing Quick Studio (live preview, download, copy Markdown/SVG, editor handoff)
- [x] Template kits (3 animated components, 6 animated backgrounds with palette + speed options)
- [ ] Property functions per tool
- [ ] More templates, fonts, and themes
- [ ] Export to JPEG

## License

MIT

## Authors

**Owen Jerusalem** — [portfolio](https://owen-jerusalem.vercel.app) · [GitHub](https://github.com/Wenoxxxx)
**Alistair Ybanez** — [portfolio](https://alistair-web.vercel.app) · [GitHub](https://github.com/Drakaniia)
