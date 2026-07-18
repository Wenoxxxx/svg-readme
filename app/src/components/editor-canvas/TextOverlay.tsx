import { useEffect, useLayoutEffect, useRef } from "react";

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
  textAlign: "left" | "center" | "right";
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
  fontFamily,
  fontSize,
  fontWeight,
  color,
  textAlign,
  onChange,
  onCommit,
}: TextOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Compute overlay width — use fixed width if set, otherwise auto-size
  const overlayWidth =
    width === "auto"
      ? Math.max(content.length * fontSize * 0.6 + 16, 60)
      : width;

  // Adjust Y so the text baseline aligns with SVG text
  const adjustedY = y - fontSize * 0.85;

  // Adjust X based on text alignment so the textarea overlay matches
  // how the SVG <text> element renders with its textAnchor attribute.
  let adjustedX = x - 4;
  if (textAlign === "center") {
    adjustedX = x - overlayWidth / 2;
  } else if (textAlign === "right") {
    adjustedX = x - overlayWidth;
  }

  // Auto-focus on mount
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, [layerId]);

  // Auto-resize the textarea height whenever content changes.
  // Uses useLayoutEffect so the resize happens synchronously before paint,
  // preventing a visible flash of incorrect sizing.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (el) {
      // Reset to auto first so scrollHeight reports the actual content height
      el.style.height = "auto";
      el.style.height = Math.max(el.scrollHeight, fontSize * 1.6) + "px";
    }
  }, [content, fontSize]);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      // Figma behavior: Escape commits the text, doesn't discard it
      onCommit();
    }
  };

  // Handle blur (click outside) → commit
  const handleBlur = () => {
    onCommit();
  };

  return (
    <div
      className="absolute z-50"
      style={{
        left: adjustedX,
        top: adjustedY,
        width: overlayWidth,
        minWidth: 60,
        minHeight: fontSize * 1.6,
      }}
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-full resize-none outline-none overflow-hidden"
        style={{
          background: "transparent",
          border: "none",
          fontFamily,
          fontSize,
          fontWeight,
          color,
          textAlign,
          lineHeight: 1.4,
          padding: 0,
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          caretColor: color,
        }}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}
