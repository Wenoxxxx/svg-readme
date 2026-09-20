import { useEffect, useRef } from "react";
import {
  getTextLines,
  getLineHeight,
  getTextBlockHeight,
  getTextBlockWidth,
} from "../../lib/editor/textMeasure";
import { getTextVerticalOffset } from "../../lib/editor/textAlign";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextOverlayProps {
  /** The text layer ID being edited */
  layerId: string;
  /** Current text content */
  content: string;
  /** Position and size of the overlay */
  x: number;
  y: number;
  width: number | "auto";
  height: number;
  /** Text styling */
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  /** Background fill of the text box (hex). Shows as overlay background. */
  backgroundColor?: string;
  textAlign: "left" | "center" | "right" | "justify";
  /** Vertical alignment inside the text box */
  textAlignVertical?: "top" | "center" | "bottom";
  /** Text box resizing behavior: auto modes let the box hug the content. */
  textAutoResize?: "NONE" | "HEIGHT" | "WIDTH_AND_HEIGHT";
  lineHeight?: number;
  letterSpacing?: number;
  italic?: boolean;
  textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
  textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE";
  /** Called with updated content on change */
  onChange: (content: string) => void;
  /** Called when editing should commit/blur */
  onCommit: () => void;
}

// Note: Escape now commits (calls onCommit), matching Figma behavior.

// ─── Component ───────────────────────────────────────────────────────────────

export default function TextOverlay({
  layerId,
  content,
  x,
  y,
  width,
  height,
  fontFamily,
  fontSize,
  fontWeight,
  color,
  backgroundColor,
  textAlign,
  textAlignVertical = "top",
  textAutoResize = "NONE",
  lineHeight,
  letterSpacing = 0,
  italic = false,
  textDecoration = "NONE",
  textCase = "ORIGINAL",
  onChange,
  onCommit,
}: TextOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Geometry that mirrors ElementsRenderer/TextElement exactly ─────────────
  // Defensive: content/width/fontSize may be malformed after a bad import or
  // stale localStorage — never let a measurement throw and crash the ErrorBoundary.
  const safeContent = typeof content === "string" ? content : String(content ?? "");
  const safeWidth: number | "auto" =
    typeof width === "number" && Number.isFinite(width) ? width : width === "auto" ? "auto" : "auto";
  const safeFontSize = typeof fontSize === "number" && Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 14;
  const safeFontWeight = typeof fontWeight === "number" ? fontWeight : 400;
  const safeLetterSpacing = typeof letterSpacing === "number" && Number.isFinite(letterSpacing) ? letterSpacing : 0;
  const safeHeight = typeof height === "number" && Number.isFinite(height) ? height : safeFontSize * 1.4;

  const isAutoWidth = safeWidth === "auto";
  const resizeMode = textAutoResize ?? "WIDTH_AND_HEIGHT";
  // wrapWidth = 0 disables wrapping (auto), otherwise use the fixed box width.
  const wrapWidth = isAutoWidth || resizeMode === "WIDTH_AND_HEIGHT" ? 0 : (safeWidth as number);

  // Use the exact same line-splitting & measurement as the SVG renderer.
  const measureProps = {
    fontFamily: fontFamily || "Inter",
    fontSize: safeFontSize,
    fontWeight: safeFontWeight,
    italic: Boolean(italic),
    letterSpacing: safeLetterSpacing,
    textCase,
  } as const;

  let lines: ReturnType<typeof getTextLines>;
  try {
    lines = getTextLines(safeContent, measureProps as never, wrapWidth);
  } catch {
    lines = [];
  }

  const lineHeightPx = getLineHeight({ lineHeight, fontSize: safeFontSize });
  const blockHeightRaw = getTextBlockHeight(lines, { lineHeight, fontSize: safeFontSize });
  // Renderer uses 0 for empty; editing overlay needs at least one line height so
  // the caret is visible at the same height as a single-line preview.
  const blockHeight = lines.length === 0 ? lineHeightPx : blockHeightRaw;
  const boxWidth = isAutoWidth ? Math.max(getTextBlockWidth(lines), 20) : (safeWidth as number);
  // For auto-height modes the box hugs the content height (mirrors computeAutoSize);
  // for fixed (NONE) it stays at the stored height.
  const isAutoHeight = resizeMode !== "NONE";
  const boxHeight = safeHeight;
  const containerHeight = isAutoHeight ? Math.max(blockHeight, safeFontSize * 1.4) : boxHeight;
  const containerWidth = boxWidth;
  const blockOffsetY = isAutoHeight ? 0 : getTextVerticalOffset(boxHeight, blockHeightRaw, textAlignVertical);

  // Horizontal alignment: auto-width boxes are always start-anchored in the
  // renderer (lineX=0, anchor=start) regardless of textAlign; justify is
  // rendered as left. Mirror that here so centered text doesn't drift.
  const effectiveTextAlign: "left" | "center" | "right" =
    isAutoWidth || resizeMode === "WIDTH_AND_HEIGHT"
      ? "left"
      : textAlign === "justify"
        ? "left"
        : (textAlign as "left" | "center" | "right");

  // x,y is the TOP-LEFT of the textbox (matching <g transform> origin).
  const safeX = typeof x === "number" && Number.isFinite(x) ? x : 0;
  const safeY = typeof y === "number" && Number.isFinite(y) ? y : 0;

  // Auto-focus on mount
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, [layerId]);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCommit();
    }
  };

  // Handle blur (click outside) → commit
  const handleBlur = () => {
    onCommit();
  };

  const textTransform =
    textCase === "UPPER"
      ? "uppercase"
      : textCase === "LOWER"
        ? "lowercase"
        : textCase === "TITLE"
          ? "capitalize"
          : "none";

  // Editing outline is drawn with outline (not border/padding) so the content
  // box stays exactly boxWidth x boxHeight — same as the SVG <text> box and
  // background <rect>. Padding is zero so text origin matches the renderer's
  // <g transform> origin exactly.
  return (
    <div
      className="absolute z-50"
      style={{
        left: safeX,
        top: safeY,
        width: containerWidth,
        height: containerHeight,
        // Re-enable hit-testing: the wrapping <foreignObject> is pointer-events:none
        // so canvas clicks still reach the SVG underneath, while the editing box
        // itself stays focusable/editable.
        pointerEvents: "auto",
        background: backgroundColor ?? "transparent",
        // Editing indicator without affecting layout — matches selection rect styling
        // (1px blue). Uses outline so it doesn't inset the text.
        outline: "1px solid rgba(59, 130, 246, 0.9)",
        outlineOffset: "0px",
        borderRadius: "3px",
        padding: 0,
        overflow: "visible",
        boxSizing: "border-box",
      }}
    >
      {/* Background rect mirror (rx=3 in renderer) is the container background;
          text block is positioned at blockOffsetY to mirror getTextVerticalOffset */}
      <textarea
        ref={textareaRef}
        value={safeContent}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="resize-none overflow-hidden"
        style={{
          position: "absolute",
          left: 0,
          top: blockOffsetY,
          width: containerWidth,
          height: blockHeight,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: fontFamily || "Inter",
          fontSize: safeFontSize,
          fontWeight: safeFontWeight,
          fontStyle: italic ? "italic" : "normal",
          color,
          textAlign: effectiveTextAlign,
          textTransform,
          textDecoration:
            textDecoration === "UNDERLINE"
              ? "underline"
              : textDecoration === "STRIKETHROUGH"
                ? "line-through"
                : "none",
          letterSpacing: safeLetterSpacing ? `${safeLetterSpacing}px` : undefined,
          lineHeight: `${lineHeightPx / safeFontSize}`,
          padding: 0,
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          caretColor: color,
          resize: "none",
          overflow: "hidden",
          boxSizing: "border-box",
          display: "block",
        }}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        rows={1}
      />
    </div>
  );
}
