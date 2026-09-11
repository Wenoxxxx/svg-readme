# svg-readme

A web app for generating animated SVG banners for your GitHub profile README. Provides a visual editor to design your banner — hand-injected CSS animations, gradients, morphing paths, and all.

<p align="center">
  <img src="https://raw.githubusercontent.com/Wenoxxxx/svg-readme/main/output/banner.svg" width="100%" alt="Banner preview" />
</p>

![banner](./banner.svg)

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
git clone https://github.com/Wenoxxxxxx/svg-readme.git
cd svg-readme
cd app && npm install
```

### Development

```bash
npm run dev      # Frontend (Vite on localhost:5173)
```

## Usage

1. Open the **Editor** in the web app to visually design your banner
2. **Save** downloads a `.svg-readme.json` design file; **Open** (or drag-drop the file onto the canvas) restores it
3. The app generates a real animated SVG
4. Reference it in your profile README:

```md
<img src="https://raw.githubusercontent.com/yourname/yourname/main/output/banner.svg" width="100%" />
```

## Roadmap

- [ ] Property functions per tool
- [ ] More templates, fonts, and themes
- [ ] Export to PNG/JPEG
- [x] Local design files (import/export JSON, no backend)

## License

MIT

## Author

**Owen Jerusalem** — [portfolio](https://owen-jerusalem.vercel.app) · [GitHub](https://github.com/Wenoxxxx)
