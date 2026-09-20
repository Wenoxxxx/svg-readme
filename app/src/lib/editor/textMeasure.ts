import type { TextElementProperties } from "../../components/editor-canvas/ElementsRenderer";

/**
 * Text measurement + line layout helpers shared by the canvas renderer,
 * the SVG exporter, and the editor's auto-resize logic — a single source of
 * truth so on-canvas rendering, exported SVG, and the editing overlay agree.
 *
 * Model mirrors open-pencil: content may span multiple lines, a fixed-width
 * box wraps words, and textAutoResize decides how the box hugs the content.
 */

export type TextLine = {
  /** Text of this line (already case-transformed). */
  text: string;
  /** Rendered width in px (measured or estimated). */
  width: number;
};

/** Case transform — ported from open-pencil's transformTextCase. */
export function transformTextCase(text: unknown, textCase?: TextElementProperties["textCase"]): string {
  const s = typeof text === "string" ? text : String(text ?? "");
  try {
    if (textCase === "UPPER") return s.toLocaleUpperCase();
    if (textCase === "LOWER") return s.toLocaleLowerCase();
    if (textCase === "TITLE") {
      return s.replace(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu, (word) =>
        word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase(),
      );
    }
  } catch {
    return s;
  }
  return s;
}

/** Resolve the effective line height (px) for a text element. */
export function getLineHeight(props: Pick<TextElementProperties, "lineHeight" | "fontSize">): number {
  const fs = typeof props.fontSize === "number" && Number.isFinite(props.fontSize) && props.fontSize > 0 ? props.fontSize : 14;
  const lh = typeof props.lineHeight === "number" && Number.isFinite(props.lineHeight) ? props.lineHeight : 0;
  return lh && lh > 0 ? lh : fs * 1.4;
}

// ─── Measurement ─────────────────────────────────────────────────────────────

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!measureCtx) {
    try {
      const canvas = document.createElement("canvas");
      measureCtx = canvas.getContext("2d");
    } catch {
      measureCtx = null; // jsdom and other non-canvas environments
    }
  }
  return measureCtx;
}

/** Best-effort font string for the measurement context. */
function fontString(props: Pick<TextElementProperties, "fontFamily" | "fontSize" | "fontWeight" | "italic">): string {
  const ff = typeof props.fontFamily === "string" && props.fontFamily ? props.fontFamily : "Inter";
  const fw = typeof props.fontWeight === "number" ? props.fontWeight : 400;
  const fs = typeof props.fontSize === "number" && Number.isFinite(props.fontSize) && props.fontSize > 0 ? props.fontSize : 14;
  return `${props.italic ? "italic " : ""}${fw} ${fs}px ${ff}`;
}

/**
 * Measure a single line of text in px. Uses canvas measureText when available;
 * falls back to the editor's heuristic (0.6 * fontSize per char + letterSpacing).
 */
export function measureTextWidth(
  text: unknown,
  props: Pick<TextElementProperties, "fontFamily" | "fontSize" | "fontWeight" | "italic" | "letterSpacing">,
): number {
  const s = typeof text === "string" ? text : String(text ?? "");
  const fs = typeof props.fontSize === "number" && Number.isFinite(props.fontSize) && props.fontSize > 0 ? props.fontSize : 14;
  const ls = typeof props.letterSpacing === "number" && Number.isFinite(props.letterSpacing) ? props.letterSpacing : 0;
  const spacing = ls * Math.max(s.length - 1, 0);
  const ctx = getMeasureCtx();
  try {
    if (ctx) {
      ctx.font = fontString({ ...props, fontSize: fs } as TextElementProperties);
      return Math.ceil(ctx.measureText(s).width + spacing);
    }
  } catch {
    // fall through to heuristic
  }
  return Math.ceil(s.length * fs * 0.6 + spacing);
}

/**
 * Split + wrap content into display lines for a given box width.
 * - Newlines always break lines.
 * - When boxWidth is finite (> 0), long lines wrap on word boundaries.
 * - When auto (0 / undefined), lines are only broken by explicit newlines.
 * Returns lines with measured widths (case-transformed text).
 * Defensive: content/boxWidth/props may be malformed from stale storage — never throw.
 */
export function getTextLines(
  content: unknown,
  props: Pick<TextElementProperties, "fontFamily" | "fontSize" | "fontWeight" | "italic" | "letterSpacing" | "textCase">,
  boxWidth: unknown,
): TextLine[] {
  try {
    const text = transformTextCase(content, props.textCase);
    if (!text) return [];

    const bw = typeof boxWidth === "number" && Number.isFinite(boxWidth) ? boxWidth : 0;
    const wrap = bw > 0;
    const lines: TextLine[] = [];
    for (const raw of text.split("\n")) {
      if (!wrap) {
        lines.push({ text: raw, width: measureTextWidth(raw, props) });
        continue;
      }
      const words = raw.split(/(\s+)/).filter((w) => w.length > 0);
      if (words.length === 0) {
        lines.push({ text: "", width: 0 });
        continue;
      }
      let current = "";
      let currentWidth = 0;
      const flush = () => {
        lines.push({ text: current, width: currentWidth });
        current = "";
        currentWidth = 0;
      };
      for (const word of words) {
        const w = measureTextWidth(word, props);
        if (current === "") {
          current = word;
          currentWidth = w;
        } else if (currentWidth + w <= bw) {
          current += word;
          currentWidth += w;
        } else {
          flush();
          current = word;
          currentWidth = w;
        }
      }
      if (current !== "") flush();
    }
    return lines;
  } catch {
    return [];
  }
}

/** Total rendered height of a set of lines (lineHeight * line count). */
export function getTextBlockHeight(
  lines: TextLine[],
  props: Pick<TextElementProperties, "lineHeight" | "fontSize">,
): number {
  if (lines.length === 0) return 0;
  return lines.length * getLineHeight(props);
}

/** Longest line width — used as the auto box width. */
export function getTextBlockWidth(lines: TextLine[]): number {
  return lines.reduce((max, l) => Math.max(max, l.width), 0);
}

/**
 * Compute the display box size for a text element from content + resize mode —
 * the single source of truth for box geometry shared by the canvas renderer,
 * the SVG exporter, and the editing overlay (A11).
 *
 * - Auto width: measured longest line (min 20px).
 * - Auto height: line count × lineHeight (min fontSize × 1.4).
 * - Fixed box: keep the explicit width/height.
 */
export function getTextAutoBox(
  props: Pick<TextElementProperties, "width" | "height" | "fontFamily" | "fontSize" | "fontWeight" | "italic" | "letterSpacing" | "textCase" | "textAutoResize" | "lineHeight">,
  content: unknown,
): { width: number; height: number } {
  try {
    const isAutoWidth = props.width === "auto";
    const resize = props.textAutoResize ?? "NONE";
    const fixedWidth = typeof props.width === "number" && Number.isFinite(props.width) ? props.width : 0;
    const wrapWidth = isAutoWidth || resize === "WIDTH_AND_HEIGHT" ? 0 : fixedWidth;
    const lines = getTextLines(content, props, wrapWidth);
    const fs = typeof props.fontSize === "number" && Number.isFinite(props.fontSize) && props.fontSize > 0 ? props.fontSize : 14;
    const width = isAutoWidth
      ? Math.max(getTextBlockWidth(lines), 20)
      : fixedWidth;
    const rawHeight = typeof props.height === "number" && Number.isFinite(props.height) ? props.height : fs * 1.4;
    const height = isAutoWidth
      ? Math.max(getTextBlockHeight(lines, props), fs * 1.4)
      : rawHeight;
    return { width, height };
  } catch {
    return { width: 20, height: 20 };
  }
}

export function computeAutoSize(
  props: Pick<TextElementProperties, "width" | "height" | "fontFamily" | "fontSize" | "fontWeight" | "italic" | "letterSpacing" | "textCase" | "lineHeight" | "textAutoResize">,
  content: unknown,
): { width?: number; height?: number } {
  try {
    const mode = props.textAutoResize ?? "NONE";
    if (mode === "NONE") return {};
    const boxWidth = props.width === "auto" ? 0 : (typeof props.width === "number" && Number.isFinite(props.width) ? props.width : 0);
    const lines = getTextLines(content, props, boxWidth);
    const fs = typeof props.fontSize === "number" && Number.isFinite(props.fontSize) && props.fontSize > 0 ? props.fontSize : 14;
    const changes: { width?: number; height?: number } = {};
    if (mode === "WIDTH_AND_HEIGHT") {
      changes.width = Math.max(getTextBlockWidth(lines), 1);
    }
    changes.height = Math.max(getTextBlockHeight(lines, props), fs * 1.4);
    return changes;
  } catch {
    return {};
  }
}
