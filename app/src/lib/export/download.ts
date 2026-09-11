import type { ElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import { svgStringToPngBlob } from "../exportPng";

// ─── Download helpers ─────────────────────────────────────────────────────────

export function downloadSvg(svgString: string, filename = "banner.svg"): void {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function copySvgText(svgString: string): Promise<void> {
  return guardedClipboardWrite(() => navigator.clipboard.writeText(svgString));
}

export function copyMarkdown(filename = "banner.svg"): Promise<void> {
  const md = `![banner](./${filename})`;
  return guardedClipboardWrite(() => navigator.clipboard.writeText(md));
}

/**
 * Copy the current SVG as a PNG image to the clipboard.
 * Uses the Clipboard API to write a PNG blob.
 * When `elementProperties` is provided, fonts are inlined so the rasterized
 * PNG keeps the document's typography.
 */
export async function copyImageToClipboard(
  svgString: string,
  width: number,
  height: number,
  elementProperties?: Record<string, ElementProperties>,
  scale: number = 2,
): Promise<void> {
  const blob = await svgStringToPngBlob(svgString, width, height, scale, elementProperties);
  await guardedClipboardWrite(() =>
    navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]),
  );
}

/** Friendly message shown when the Clipboard API is unavailable or denied. */
export const CLIPBOARD_UNAVAILABLE_MESSAGE =
  "Copy unavailable (clipboard needs HTTPS or permission) — use download instead.";

/** Whether the async Clipboard API exists in this browser/context. */
export function isClipboardAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  );
}

async function guardedClipboardWrite(write: () => Promise<void>): Promise<void> {
  if (!isClipboardAvailable()) {
    throw new Error(CLIPBOARD_UNAVAILABLE_MESSAGE);
  }
  try {
    await write();
  } catch {
    throw new Error(CLIPBOARD_UNAVAILABLE_MESSAGE);
  }
}

/** Broadcast a copy failure so UI can toast it (see EditorLayout listener). */
export function notifyCopyFailure(message: string = CLIPBOARD_UNAVAILABLE_MESSAGE): void {
  window.dispatchEvent(new CustomEvent("copy-failed", { detail: { message } }));
}
