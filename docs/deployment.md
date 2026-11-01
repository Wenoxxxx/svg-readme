# Deployment Guide

svg-readme is a static Vite build. No server, no database, no runtime secrets.
This guide covers deploying to Vercel, the settings that matter, and what to
check after the first deploy.

- [Prerequisites](#prerequisites)
- [How the build works](#how-the-build-works)
- [Deploy to Vercel](#deploy-to-vercel)
- [Environment variables](#environment-variables)
- [Pre-deploy checklist](#pre-deploy-checklist)
- [Post-deploy smoke test](#post-deploy-smoke-test)
- [Updating the domain](#updating-the-domain)
- [Troubleshooting](#troubleshooting)
- [Rollback](#rollback)
- [Alternative hosts](#alternative-hosts)

## Prerequisites

- Node.js **>= 22.12** (also pinned in `.nvmrc` and `engines`)
- npm 10+
- A Vercel account with access to `Wenoxxxx/svg-readme`
- The repo pushed to `main` (Vercel's Git integration deploys from Git)

Local build sanity check before touching Vercel:

```bash
npm run install:all   # npm ci inside app/
npm run lint
npm run test
npm run build         # writes app/dist/
npm run preview       # serve app/dist/ on http://localhost:4173
```

## How the build works

| Item | Value |
|---|---|
| Framework | Vite 8 + React 19 (static SPA) |
| Install command | `npm --prefix app ci` |
| Build command | `npm --prefix app run build` (`tsc -b && vite build`) |
| Output directory | `app/dist` |
| SPA fallback | rewrite `/(.*)` → `/index.html` |
| Node | 22.x (`.nvmrc`) |

Two configs exist on purpose:

- `vercel.json` (repo root) — build overrides for a project whose **Root
  Directory is the repo root**.
- `app/vercel.json` — SPA rewrite plus cache/security headers for a project
  whose **Root Directory is `app`**.

Pick one project layout; you do not need both.

## Deploy to Vercel

### Option A — Root Directory = `app` (recommended)

1. Vercel dashboard → **Add New… → Project** → import the GitHub repo.
2. Set **Root Directory** to `app`.
3. Framework preset: **Vite** (auto-detected).
4. Install / Build / Output come from `app/package.json`:
   - Install: `npm ci`
   - Build: `npm run build`
   - Output: `dist`
5. **Environment Variables** — add `VITE_CONTACT_EMAIL` (see below).
6. Deploy.

`app/vercel.json` supplies the SPA rewrite and response headers automatically,
because Vercel reads `vercel.json` from the configured root directory.

### Option B — Root Directory = repo root

1. Import the repo without changing the Root Directory.
2. Leave the framework preset on **Other**.
3. The root `vercel.json` drives everything:
   - `installCommand`: `npm --prefix app ci`
   - `buildCommand`: `npm --prefix app run build`
   - `outputDirectory`: `app/dist`
4. Add `VITE_CONTACT_EMAIL`, then deploy.

Option B is useful when you want repo-level tooling in the build, but it does
not apply `app/vercel.json` headers — the root config only carries the rewrite.
If you need the cache/security headers with Option B, copy the `headers` block
from `app/vercel.json` into the root file.

### Git integration behavior

- Push to `main` → production deploy.
- Pull request → Preview deployment (URL posted on the PR).
- `main` is also gated by CI (`.github/workflows/pr-check.yml`): lint,
  typecheck, tests (704), build, plus PR template/summary jobs.
- A failed CI run does **not** automatically block a Vercel deploy; Vercel
  builds on its own. Use branch protection on `main` if you want a hard gate.

### CLI deploy (optional)

```bash
npm i -g vercel
vercel link          # choose the project once
vercel               # preview deploy
vercel --prod        # production deploy
```

Run from the repo root so the root `vercel.json` applies, or from `app/` when
the project root is `app`.

## Environment variables

| Name | Required | Default | Used by |
|---|---|---|---|
| `VITE_CONTACT_EMAIL` | No | `hello@example.com` | `app/src/pages/landing/Contacts.tsx` mailto form |

Notes:

- Vite inlines `VITE_*` at **build time**. Changing the value requires a new
  deploy; it is not read at runtime.
- Set it for Production, Preview, and Development if you want the form to work
  everywhere.
- `.env.local` is git-ignored; `.env.example` is the template.
- Do not put secrets here. Anything prefixed `VITE_` ships to the browser.

## Pre-deploy checklist

- [ ] `npm run lint` clean
- [ ] `npm run test` — 68 files / 704 tests pass
- [ ] `npm run build` clean (no chunk-size warning; editor is a separate chunk)
- [ ] `npm run preview` — landing page, `/editor`, `/about`, `/contacts` render
- [ ] Unknown route (e.g. `/nope`) shows the 404 page, not a blank screen
- [ ] `VITE_CONTACT_EMAIL` set (or intentionally left as placeholder)
- [ ] Domain URLs updated if not `svg-readme.vercel.app` (see below)
- [ ] Commit is on `main` (or Open a PR for a Preview URL first)

## Post-deploy smoke test

1. `/` — hero renders, logo loads, fonts look like Poppins/JetBrains Mono.
2. Quick Studio — change handle/tagline/accent, preview updates; **Download SVG**
   saves `banner.svg`; **Copy Markdown** / **Copy SVG** work.
3. **Open in Editor** — hands off to `/editor` and rebuilds editable layers.
4. Deep-link refresh — reload `/editor`, `/about`, `/contacts`, `/nope` directly
   (must not 404 at the HTTP level).
5. Editor — draw a shape, Ctrl+S downloads `.svg-readme.json`, Export tab
   produces SVG / PNG / GIF.
6. Hard-refresh `/` twice — hashed assets should be served from cache
   (`cache-control: public, max-age=31536000, immutable`).
7. `/robots.txt` and `/sitemap.xml` return their files, not `index.html`.

## Updating the domain

The production URL is hard-coded in three places. If you move off
`https://svg-readme.vercel.app`, update all of them:

| File | What to change |
|---|---|
| `app/index.html` | `canonical`, `og:url`, `og:image`, `twitter:image` |
| `app/public/robots.txt` | `Sitemap:` line |
| `app/public/sitemap.xml` | every `<loc>` |

Then redeploy. Verify with the Open Graph debugger of your choice (e.g. the
Facebook Sharing Debugger) after the deploy finishes.

## Troubleshooting

**Blank white page after deploy**
Check the browser console. Usual causes: asset paths built for a sub-path, or
the SPA rewrite missing (deep link returns Vercel 404 HTML). Confirm the
project picked the right root (`app` vs repo root) and that the rewrite is
present in the `vercel.json` Vercel actually reads.

**Hard refresh on `/editor` returns 404**
The rewrite is not applied. With Root Directory = `app`, `app/vercel.json` must
exist and contain the `rewrites` block.

**Fonts fall back to system sans/mono**
Font files are WOFF2 in `app/src/assets/fonts/woff2/` and referenced from
`app/src/index.css`. Filenames are case-sensitive on Vercel's Linux builders —
keep the exact casing. Also confirm `dist/assets/*.woff2` exists after a build.

**Contact form opens mail with `hello@example.com`**
`VITE_CONTACT_EMAIL` was not set at build time. Add it in Vercel and redeploy
(env changes do not apply retroactively to an existing build).

**Build fails with `EBADENGINE` / Node version errors**
Vercel is using an older Node. Set the project Node version to 22.x
(Settings → General → Node.js Version) or add `engines` — already present.

**`npm ci` fails with "lock file does not satisfy"**
The lockfile was edited by hand. Run `npm install` inside `app/` to regenerate
`app/package-lock.json`, commit it, and redeploy. The repo root intentionally
has no lockfile.

**Stale deploy / old bundle**
Vercel serves hashed assets immutably and `index.html` with
`max-age=0, must-revalidate`. If you still see an old bundle, check that the
deploy actually promoted to Production and hard-refresh once.

**GIF export blocked**
GIF/PNG-frame export runs in the browser. If it fails, verify the tab is
focused and that the browser allows canvas/Blob downloads; nothing about this
feature depends on the host.

## Rollback

Vercel keeps every deployment immutable.

- Dashboard → **Deployments** → pick the last good one → **⋯ → Promote to
  Production**. Instant, no rebuild.
- Or revert the commit on `main` and let Git integration redeploy.
- `git revert <sha> && git push origin main` is the cleanest audit trail.

## Alternative hosts

The output is plain static files, so any static host works. Required behavior:

- Serve `app/dist/`
- Rewrite unknown paths to `/index.html`
- Serve `.woff2` as `font/woff2`, `.svg` as `image/svg+xml`
- Long cache for `/assets/*`, no-cache for `index.html`

Netlify example (`netlify.toml`):

```toml
[build]
  base = "app"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Cloudflare Pages: build command `npm run build`, build output directory `dist`,
root directory `app`; add a `_redirects` file containing `/* /index.html 200`
in `app/public/` if you want SPA fallback without Pages' automatic handling.
