# svg-readme

A web app for generating animated SVG banners for your GitHub profile README. Provides a visual editor to design your banner — hand-injected CSS animations, gradients, morphing paths, and all.

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4, React Router |

No backend. No database. Designs live in local `.svg-readme.json` files + browser localStorage.

## Project Structure

```
svg-readme/
├── app/               # React frontend — canvas editor & pages
│   └── src/
│       ├── lib/designFile.ts   # Design JSON schema, import/export
│       └── lib/persistence.ts  # Local dirty/snapshot tracking (no server)
└── package.json       # Root script (runs frontend)
```

## Getting Started

### Prerequisites

- Node.js

### Setup

```bash
git clone https://github.com/Wenoxxxx/svg-readme.git
cd svg-readme
cd app && npm install
```

### Commands

```bash
npm run dev          # Frontend (Vite on localhost:5173) — run from repo root
cd app && npm run build   # Production build
cd app && npm run test    # Vitest suite (use --pool=threads on Windows; forks pool can time out)
cd app && npm run lint    # ESLint
```

## Usage

1. Open the **Editor** in the web app to visually design your banner.
2. **Save** (navbar button or `Ctrl+S`/`Cmd+S`) downloads a `.svg-readme.json` design file.
3. **Open** (navbar button or drag-drop the file onto the canvas) validates the file and replaces the current document. Drag-dropping an `.svg` file instead appends its layers to the canvas.
4. Work in progress autosaves to browser localStorage; the navbar dot flags unsaved changes, and leaving with unsaved work prompts for confirmation.
5. Export the finished banner as SVG, PNG, or GIF and reference it in your profile README:

```md
<img src="https://raw.githubusercontent.com/yourname/yourname/main/output/banner.svg" width="100%" />
```

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
  "exportedAt": "ISO timestamp"
}
```

- Invalid files (bad JSON, wrong version, bad `frameSize`, duplicate layer ids, unknown element types) are rejected with an error; `elementProperties` entries with no matching layer are dropped.
- Images embed as data URLs, so image-heavy designs produce large JSON files — keep source images small.

## Roadmap

- [ ] Property functions per tool
- [ ] More templates, fonts, and themes
- [ ] Export to JPEG
- [x] Local design files (import/export JSON, no backend)
- [x] Export to PNG/GIF

## License

MIT

## Author

**Owen Jerusalem** — [portfolio](https://owen-jerusalem.vercel.app) · [GitHub](https://github.com/Wenoxxxx)
