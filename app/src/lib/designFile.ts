import type { LayerType } from "../context/EditorContext";
import type { ElementProperties } from "../components/editor-canvas/ElementsRenderer";

// ─── Design file schema (v1) ──────────────────────────────────────────────────
// Single JSON document holding the full editor state. Saved/opened as
// `*.svg-readme.json` (plain `.json` also accepted on import).

export const DESIGN_FILE_VERSION = 1;
export const DESIGN_FILE_EXTENSION = ".svg-readme.json";

export interface DocumentState {
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
  frameSize: { width: number; height: number };
}

export interface DesignFileV1 {
  version: 1;
  kind: "svg-readme-design";
  name: string;
  frameSize: { width: number; height: number };
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
  exportedAt: string;
  appVersion?: string;
}

export class DesignFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DesignFileError";
  }
}

// ─── Serialize ────────────────────────────────────────────────────────────────

export function serializeDesign(
  doc: DocumentState,
  name: string,
  appVersion?: string,
): DesignFileV1 {
  return {
    version: 1,
    kind: "svg-readme-design",
    name: name.trim() || "Untitled",
    frameSize: { width: doc.frameSize.width, height: doc.frameSize.height },
    layers: doc.layers.map((l) => ({ ...l })),
    elementProperties: { ...doc.elementProperties },
    exportedAt: new Date().toISOString(),
    ...(appVersion ? { appVersion } : {}),
  };
}

export function serializeDesignJson(
  doc: DocumentState,
  name: string,
  appVersion?: string,
): string {
  return JSON.stringify(serializeDesign(doc, name, appVersion), null, 2);
}

// ─── Parse / validate ─────────────────────────────────────────────────────────

const LAYER_TYPES = new Set(["text", "shape", "image", "group"]);
const ELEMENT_TYPES = new Set(["text", "shape", "image", "path"]);

function assertFrameSize(value: unknown): { width: number; height: number } {
  if (typeof value !== "object" || value === null) {
    throw new DesignFileError("Missing frameSize.");
  }
  const { width, height } = value as Record<string, unknown>;
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new DesignFileError("frameSize.width/height must be numbers.");
  }
  const w = Math.round(width as number);
  const h = Math.round(height as number);
  if (w < 1 || h < 1 || w > 10000 || h > 10000) {
    throw new DesignFileError("frameSize out of range (1–10000).");
  }
  return { width: w, height: h };
}

function assertLayers(value: unknown): LayerType[] {
  if (!Array.isArray(value)) throw new DesignFileError("layers must be an array.");
  const seen = new Set<string>();
  return value.map((raw, i) => {
    if (typeof raw !== "object" || raw === null) {
      throw new DesignFileError(`layers[${i}] must be an object.`);
    }
    const l = raw as Record<string, unknown>;
    if (typeof l.id !== "string" || l.id.length === 0) {
      throw new DesignFileError(`layers[${i}].id must be a non-empty string.`);
    }
    if (seen.has(l.id)) throw new DesignFileError(`Duplicate layer id "${l.id}".`);
    seen.add(l.id);
    return {
      id: l.id,
      name: typeof l.name === "string" ? l.name : "Layer",
      type: typeof l.type === "string" && LAYER_TYPES.has(l.type)
        ? (l.type as LayerType["type"])
        : "shape",
      locked: l.locked === true,
      visible: l.visible !== false,
      active: false,
      parentId: typeof l.parentId === "string" ? l.parentId : null,
      collapsed: l.collapsed === true ? true : undefined,
      masked: (l as Record<string, unknown>).masked === true ? true : undefined,
    } as LayerType;
  });
}

function assertElementProperties(
  value: unknown,
  layers: LayerType[],
): Record<string, ElementProperties> {
  if (typeof value !== "object" || value === null) {
    throw new DesignFileError("elementProperties must be an object.");
  }
  const out: Record<string, ElementProperties> = {};
  const layerIds = new Set(layers.map((l) => l.id));
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "object" || raw === null) {
      throw new DesignFileError(`elementProperties["${key}"] must be an object.`);
    }
    const props = raw as Record<string, unknown>;
    if (typeof props.type !== "string" || !ELEMENT_TYPES.has(props.type)) {
      throw new DesignFileError(
        `elementProperties["${key}"].type must be one of text/shape/image/path.`,
      );
    }
    // Keep unknown element fields intact (forward-compat); orphan entries
    // (no matching layer) are dropped so imports stay consistent.
    if (!layerIds.has(key)) continue;
    out[key] = { ...(props as object) } as ElementProperties;
  }
  return out;
}

/**
 * Parse + validate unknown JSON into a DocumentState + name.
 * Accepts v1 files; rejects everything else with DesignFileError.
 */
export function parseDesignFile(data: unknown): { doc: DocumentState; name: string } {
  if (typeof data !== "object" || data === null) {
    throw new DesignFileError("Design file must be a JSON object.");
  }
  const file = data as Record<string, unknown>;
  if (file.version !== 1 || file.kind !== "svg-readme-design") {
    throw new DesignFileError("Unsupported design file (expected version 1).");
  }
  const frameSize = assertFrameSize(file.frameSize);
  const layers = assertLayers(file.layers);
  const elementProperties = assertElementProperties(file.elementProperties, layers);
  const name = typeof file.name === "string" && file.name.trim() ? file.name : "Untitled";
  return { doc: { layers, elementProperties, frameSize }, name };
}

export function parseDesignJson(text: string): { doc: DocumentState; name: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new DesignFileError("File is not valid JSON.");
  }
  return parseDesignFile(data);
}

// ─── File helpers (browser) ───────────────────────────────────────────────────

export function getDesignFilename(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
  return `${slug}${DESIGN_FILE_EXTENSION}`;
}

export function downloadDesignFile(doc: DocumentState, name: string): void {
  const json = serializeDesignJson(doc, name);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = getDesignFilename(name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readDesignFileFromFile(file: File): Promise<{ doc: DocumentState; name: string }> {
  const text = await file.text();
  return parseDesignJson(text);
}

/** Warn threshold for image-heavy designs (dataURLs bloat JSON fast). */
export function estimateDesignJsonSize(doc: DocumentState, name: string): number {
  return serializeDesignJson(doc, name).length;
}
