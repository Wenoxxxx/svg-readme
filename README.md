# svg-readme

A full-stack web application for generating animated SVG banners for your GitHub profile README. This project provides a visual editor to design your banner, along with a backend to generate the final SVG — complete with hand-injected CSS animations for effects like drifting grid backgrounds, morphing wave paths, and staggered fade-ins.

<p align="center">
  <img src="https://raw.githubusercontent.com/Wenoxxxxxx/svg-readme/main/output/banner.svg" width="100%" alt="Banner preview" />
</p>

## Overview

GitHub strips `<script>` tags from anything rendered inline in a README, but an SVG referenced as an external image (`<img src="...">`) is served as a static asset and renders fully in the browser — CSS `@keyframes`, gradients, and all.

`svg-readme` has evolved from a CLI script into a comprehensive web-based platform:
- **`app/`**: A React + Vite frontend (using Tailwind CSS v4) providing a rich, interactive canvas to visually design your banner.
- **`backend/`**: An Express server designed to handle the generation of the customized SVGs.

## Tech Stack

| Layer | Tool |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS v4, React Router |
| **Backend** | Express |
| **Language** | TypeScript / JavaScript |

## Project Structure

```text
svg-readme/
├── .github/             # GitHub Actions & Templates
├── app/                 # React frontend (Editor & Landing pages)
│   ├── public/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── layouts/     # Page layouts
│   │   ├── pages/       # Route pages (Home, Editor, etc.)
│   │   └── App.tsx      # Main application routing
│   └── package.json     # Frontend dependencies
├── backend/             # Express backend (SVG generation engine)
│   └── package.json     # Backend dependencies
└── README.md
```

## Roadmap

- [x] Initial CLI for SVG generation
- [x] React + Vite frontend editor UI
- [ ] Backend Express API for dynamic SVG rendering
- [ ] User authentication and saved banners
- [ ] More templates, fonts, and customizable themes
- [ ] Export to PNG/JPEG format

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Wenoxxxxxx/svg-readme.git
cd svg-readme
```

### 2. Run the Frontend

Navigate to the `app` directory to launch the web editor:

```bash
cd app
npm install
npm run dev
```

### 3. Run the Backend

Navigate to the `backend` directory to run the API:

```bash
cd backend
npm install
# Note: Ensure you have an entry point like index.js configured
node index.js 
```

## Customization & Usage

1. Open the **Editor** in the web app to visually adjust the dimensions, content, and styling of your profile banner.
2. The UI communicates with the backend to generate a real, animated SVG file.
3. Reference the raw SVG file from your `<username>/<username>` profile repository:

```md
<img src="https://raw.githubusercontent.com/Wenoxxxxxx/svg-readme/main/output/banner.svg" width="100%" alt="Owen Jerusalem banner" />
```

## License

MIT

## Author

**Owen Jerusalem** — [portfolio](https://owen-jerusalem.vercel.app) · [GitHub](https://github.com/Wenoxxxx)
