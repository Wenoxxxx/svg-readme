import type { LayerType } from "../context/EditorContext";
import type { ElementProperties } from "../components/editor-canvas/ElementsRenderer";

// ─── Local document persistence (no backend) ────────────────────────────────
// Single source of truth lives in EditorContext (localStorage) + explicit
// `.svg-readme.json` files via lib/designFile. This module only tracks the
// last-saved snapshot for dirty detection, debounced autosave status, and a
// local project id so Ctrl+S / Save can mark clean without a server.

export interface DocumentState {
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
  frameSize: { width: number; height: number };
}

export interface SaveResult {
  success: boolean;
  error?: string;
}

export type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

type StatusListener = (status: SaveStatus) => void;

let currentProjectId: string | null = null;
let lastSavedSnapshot: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let isSaving = false;
const AUTOSAVE_DELAY_MS = 1500;

let listeners: StatusListener[] = [];
let currentStatus: SaveStatus = { kind: "idle" };

function notifyListeners(status: SaveStatus) {
  currentStatus = status;
  listeners.forEach((fn) => fn(status));
}

function snapshot(doc: DocumentState): string {
  return JSON.stringify(doc);
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function onSaveStatus(fn: StatusListener): () => void {
  listeners.push(fn);
  fn(currentStatus);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function getSaveStatus(): SaveStatus {
  return currentStatus;
}

export function getCurrentProjectId(): string | null {
  return currentProjectId;
}

export function setCurrentProjectId(id: string | null): void {
  currentProjectId = id;
  if (!id) lastSavedSnapshot = null;
}

/** First save: assign a local id and mark the snapshot clean. */
export async function saveNewProject(name: string, doc: DocumentState): Promise<string> {
  void name;
  notifyListeners({ kind: "saving" });
  currentProjectId = randomId();
  lastSavedSnapshot = snapshot(doc);
  notifyListeners({ kind: "saved", at: new Date() });
  return currentProjectId;
}

/** Mark the current document clean (Ctrl+S triggers a file download in the UI). */
export async function saveDocument(doc: DocumentState): Promise<SaveResult> {
  if (isSaving) return { success: false, error: "Save already in progress" };
  isSaving = true;
  try {
    notifyListeners({ kind: "saving" });
    if (!currentProjectId) currentProjectId = randomId();
    lastSavedSnapshot = snapshot(doc);
    notifyListeners({ kind: "saved", at: new Date() });
    return { success: true };
  } finally {
    isSaving = false;
  }
}

/** Adopt an imported/opened document as the new clean baseline. */
export function adoptDocumentAsSaved(doc: DocumentState, projectId?: string | null): string {
  currentProjectId = projectId ?? randomId();
  lastSavedSnapshot = snapshot(doc);
  notifyListeners({ kind: "saved", at: new Date() });
  return currentProjectId;
}

export function autosave(doc: DocumentState): void {
  if (snapshot(doc) === lastSavedSnapshot) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    // Local autosave = mark snapshot without a file download; the dirty
    // indicator in EditorContext remains the visual signal until explicit Save.
    notifyListeners({ kind: "saved", at: new Date() });
  }, AUTOSAVE_DELAY_MS);
}

export async function flushAutosave(_doc: DocumentState): Promise<void> {
  void _doc;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

export function isDocumentDirty(doc: DocumentState): boolean {
  return snapshot(doc) !== lastSavedSnapshot;
}

export function resetPersistence(): void {
  currentProjectId = null;
  lastSavedSnapshot = null;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  notifyListeners({ kind: "idle" });
}
