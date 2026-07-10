# svg-readme

Generate animated SVG banners for your GitHub profile README — built with React components rendered through [Satori](https://github.com/vercel/satori), with hand-injected CSS animations for effects Satori can't produce on its own (drifting grid backgrounds, morphing wave paths, staggered fade-ins).

<p align="center">
  <img src="./output/banner.svg" width="100%" alt="Banner preview" />
</p>

## Why this exists

GitHub strips `<script>` tags from anything rendered inline in a README, but an SVG referenced as an external image (`<img src="...">`) is served as a static asset and renders fully in the browser — CSS `@keyframes`, gradients, and all. `svg-readme` takes advantage of that: it builds a real animated SVG file once, commits it to the repo, and your profile README just points to it.

## Features

- **Component-based layout** — write the banner's structure as a React component; Satori converts JSX + flexbox CSS into SVG shapes
- **CSS animations that survive as a static image** — fade-ins, a growing accent bar, a drifting grid background, and a morphing wave path, all driven by plain CSS `@keyframes` with no JavaScript required at render time
- **Custom fonts** — Poppins and JetBrains Mono, loaded as local `.ttf` files and embedded directly so there's no dependency on external font requests
- **One command to rebuild** — `npm run build` regenerates `output/banner.svg` from the component

## Tech stack

| Layer | Tool |
|---|---|
| Layout engine | [Satori](https://github.com/vercel/satori) (JSX → SVG) |
| Components | React + TypeScript |
| Runtime | [tsx](https://github.com/privatenumber/tsx) |
| Animation | Hand-written CSS, spliced into Satori's output |

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/Wenoxxxxxx/svg-readme.git
cd svg-readme
npm install
```

### 2. Add fonts

Satori can't fetch fonts at runtime — download them and place the `.ttf` files here:

```
assets/fonts/Poppins-Medium.ttf
assets/fonts/Poppins-Regular.ttf
assets/fonts/JetBrainsMono-Medium.ttf
```

Get them from [Google Fonts: Poppins](https://fonts.google.com/specimen/Poppins) and [Google Fonts: JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono).

### 3. Build the banner

```bash
npm run build
```

This writes the finished SVG to `output/banner.svg`. Open it directly in a browser tab to preview the animation.

### 4. Use it in your profile README

Reference the raw file from your `<username>/<username>` profile repo:

```md
<img src="https://raw.githubusercontent.com/Wenoxxxxxx/svg-readme/main/output/banner.svg" width="100%" alt="Owen Jerusalem banner" />
```

## Project structure

```
svg-readme/
├── assets/
│   └── fonts/              # local .ttf files Satori embeds into the SVG
├── src/
│   ├── components/
│   │   └── Banner.tsx      # layout — positions, text, avatar frame, badge
│   └── build-svg.tsx       # renders the component, injects CSS + hand-written SVG
├── output/
│   └── banner.svg          # generated file — this is what the README references
├── package.json
└── tsconfig.json
```

## How it works

1. **`Banner.tsx`** describes the static layout — position, sizing, text, borders — using flexbox-style CSS-in-JS. Satori converts this into raw SVG shapes (`<rect>`, `<text>`, etc).
2. **`build-svg.tsx`** takes Satori's output and splices in what Satori can't generate on its own:
   - A `<style>` block with `@keyframes` for fade-ins, the growing accent bar, and the badge
   - A hand-written animated grid background, tiled and clipped so it drifts seamlessly on loop
   - A hand-written wave `<path>` that morphs shape via CSS's `d` property
3. Since Satori strips `className` from its output, animations that need to target specific elements use structural CSS selectors (`text:nth-of-type(1)`, `rect[width="8"]`) instead of classes.

## Customization

Edit the constants at the top of `src/build-svg.tsx`:

```ts
const NAME = "Owen Jerusalem";
const SUBTITLE = "IT STUDENT | BUKSU";
const PRIMARY = "#1b5def";
const AVATAR_URL = "https://github.com/Wenoxxxxxx.png?size=200";
```

Then run `npm run build` again to regenerate.

## License

MIT

## Author

**Owen Jerusalem** — [portfolio](https://owen-jerusalem.vercel.app) · [GitHub](https://github.com/Wenoxxxxxx)
