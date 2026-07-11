import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { renderToSvg } from "../render/render";
import { getTemplate, TEMPLATES } from "../templates/registry";
import type { EditorState } from "./state";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const STATE_FILE = path.join(ROOT, "src/ui/state.json");
const OUT_DIR = path.join(ROOT, "output");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // avatars can be large base64 data URIs

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

function readState(): EditorState {
  if (!fs.existsSync(STATE_FILE)) return { components: [] };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { components: [] };
  }
}

function writeState(state: EditorState): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

// Full template detail — the UI needs defaults + fields + dims to render the
// form and size the preview without a second round-trip per type.
app.get("/api/templates", (_req, res) => {
  const detail = Object.values(TEMPLATES).map((t) => ({
    ...t.meta,
    defaults: t.defaults,
    fields: t.fields,
    width: t.renderable.width,
    height: t.renderable.height,
  }));
  res.json(detail);
});

app.get("/api/defaults/:type", (req, res) => {
  const t = getTemplate(req.params.type);
  if (!t) return res.status(404).json({ error: "Unknown template" });
  res.json(t.defaults);
});

app.get("/api/state", (_req, res) => {
  res.json(readState());
});

app.put("/api/state", (req, res) => {
  const incoming = req.body as EditorState;
  if (!incoming || !Array.isArray(incoming.components)) {
    return res.status(400).json({ error: "Invalid state payload" });
  }
  writeState(incoming);
  res.json({ ok: true });
});

app.post("/api/render", async (req, res) => {
  const { type, props } = req.body as { type: string; props: Record<string, unknown> };
  const template = getTemplate(type);
  if (!template) return res.status(400).json({ error: `Unknown template: ${type}` });
  try {
    const svg = await renderToSvg(template.renderable, props);
    res.type("image/svg+xml").send(svg);
  } catch (err) {
    console.error("[render] failed:", err);
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/save", async (req, res) => {
  const { type, name, props } = req.body as {
    type: string;
    name: string;
    props: Record<string, unknown>;
  };
  const template = getTemplate(type);
  if (!template) return res.status(400).json({ error: `Unknown template: ${type}` });
  try {
    const svg = await renderToSvg(template.renderable, props);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const file = path.join(OUT_DIR, `${slugify(name)}.svg`);
    fs.writeFileSync(file, svg);
    res.json({ ok: true, file: path.relative(ROOT, file).replace(/\\/g, "/") });
  } catch (err) {
    console.error("[save] failed:", err);
    res.status(500).json({ error: String(err) });
  }
});

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "component"
  );
}

// ---------------------------------------------------------------------------
// Static serving: dev → Vite middleware; prod → built dist
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV !== "production";
const PORT = Number(process.env.PORT) || 5174;

async function start() {
  if (isDev) {
    const { createServer: createVite } = await import("vite");
    const vite = await createVite({
      root: path.join(ROOT, "src/ui"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(ROOT, "src/ui/dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(ROOT, "src/ui/dist/index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`\n  svg-readme editor → http://localhost:${PORT}\n`);
  });
}

start().catch((err) => {
  console.error("[ERROR] server failed to start:", err);
  process.exit(1);
});
