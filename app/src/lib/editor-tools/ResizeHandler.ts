import { MIN_SHAPE_SIZE, MIN_TEXTBOX_SIZE } from "../../components/editor-canvas/types";
import type { ElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import type { ResizeState } from "../../components/editor-canvas/types";
import type { ToolEventContext, ToolInteractionState } from "./types";
import { getTextAutoBox } from "../../lib/editor/textMeasure";

export type ResizeHandle = ResizeState["handle"];

/**
 * Whether a given element supports resize interactions.
 * Text is resizable too (Figma/open-pencil: textbox has 8 handles, behavior depends on textAutoResize).
 */
export function canResize(props: ElementProperties | null): boolean {
  if (!props) return false;
  return props.type === "shape" || props.type === "image" || props.type === "path" || props.type === "text";
}

/**
 * Whether a resize handle should apply to a text element given its auto-resize mode.
 * - WIDTH_AND_HEIGHT (auto-w/h): only horizontal handles convert to fixed; vertical handles are clamped to content.
 * - HEIGHT (auto-h, fixed-w): horizontal handles resize width, vertical handles are ignored (height auto).
 * - NONE (fixed): all handles active.
 */
export function isTextHandleEnabled(
  props: ElementProperties | null,
  handle: ResizeHandle,
): boolean {
  if (!props || props.type !== "text") return true;
  const mode = props.textAutoResize ?? "WIDTH_AND_HEIGHT";
  if (mode === "NONE") return true;
  if (mode === "HEIGHT") {
    // In auto-height mode the box height hugs content — vertical drags should not change height.
    // Horizontal + corner handles are needed to change wrap width; tc/bc are disabled.
    if (handle === "tc" || handle === "bc") return false;
    return true;
  }
  // WIDTH_AND_HEIGHT: side drags will convert to HEIGHT; tc/bc disabled until converted.
  if (mode === "WIDTH_AND_HEIGHT") {
    if (handle === "tc" || handle === "bc") return false;
    return true;
  }
  return true;
}

/**
 * Start a resize interaction.
 * For text in WIDTH_AND_HEIGHT (auto-w) mode, the bounding box width is measured from content
 * (getTextBlockWidth) so the first drag does not jump from 0→fixed. Other text modes use stored width.
 */
export function startResize(
  ctx: ToolEventContext,
  elementId: string,
  handle: ResizeHandle,
): Partial<ToolInteractionState> {
  const props = ctx.selectedProps;
  if (!props || !canResize(props)) return {};
  if (props.type === "text" && !isTextHandleEnabled(props, handle)) return {};

  // For text, compute the visual initial width/height (what the user sees) so drift is zero.
  let initialWidth = typeof props.width === "number" ? props.width : 0;
  let initialHeight = typeof props.height === "number" ? props.height : 0;
  if (props.type === "text") {
    try {
      const box = getTextAutoBox(props as never, props.content);
      if (props.width === "auto" || initialWidth === 0) initialWidth = box.width;
      if ((props.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "NONE") {
        initialHeight = box.height;
      }
    } catch {
      // fallback: keep stored values
    }
    // Enforce textbox minimums (larger than shape minimums)
    initialWidth = Math.max(initialWidth, MIN_TEXTBOX_SIZE);
    initialHeight = Math.max(initialHeight, MIN_TEXTBOX_SIZE);
  }

  return {
    resizeState: {
      elementId,
      handle,
      startX: ctx.worldPoint.x,
      startY: ctx.worldPoint.y,
      initialX: props.x,
      initialY: props.y,
      initialWidth,
      initialHeight,
      isText: props.type === "text",
      textAutoResize: props.type === "text" ? (props.textAutoResize ?? "WIDTH_AND_HEIGHT") : undefined,
    },
  };
}

/**
 * Compute new position and dimensions during resize drag.
 * When shiftKey is true, the aspect ratio is constrained proportionally
 * based on the dominant axis of the resize handle.
 * When altKey is true, the resize happens from the element's center — the
 * opposite edge is fixed and the box is re-centered on its original center
 * (B3). Shift+Alt keeps the aspect ratio while re-centering.
 */
export function updateResize(
  state: NonNullable<ToolInteractionState["resizeState"]>,
  dx: number,
  dy: number,
  shiftKey = false,
  altKey = false,
): { x: number; y: number; width: number; height: number } {
  const {
    handle,
    initialX,
    initialY,
    initialWidth,
    initialHeight,
  } = state;

  const isText = state.isText === true;
  const minW = isText ? MIN_TEXTBOX_SIZE : MIN_SHAPE_SIZE;
  const minH = isText ? MIN_TEXTBOX_SIZE : MIN_SHAPE_SIZE;
  const aspectRatio = initialWidth / initialHeight;

  let newX = initialX;
  let newY = initialY;
  let newWidth = initialWidth;
  let newHeight = initialHeight;

  switch (handle) {
    case "br":
      newWidth = Math.max(initialWidth + dx, minW);
      newHeight = Math.max(initialHeight + dy, minH);
      break;
    case "mr":
      newWidth = Math.max(initialWidth + dx, minW);
      if (shiftKey) newHeight = Math.max(newWidth / aspectRatio, minH);
      break;
    case "bc":
      newHeight = Math.max(initialHeight + dy, minH);
      if (shiftKey) newWidth = Math.max(newHeight * aspectRatio, minW);
      break;
    case "tl":
      newWidth = Math.max(initialWidth - dx, minW);
      newHeight = Math.max(initialHeight - dy, minH);
      newX = initialX + (initialWidth - newWidth);
      newY = initialY + (initialHeight - newHeight);
      break;
    case "ml":
      newWidth = Math.max(initialWidth - dx, minW);
      newX = initialX + (initialWidth - newWidth);
      if (shiftKey) newHeight = Math.max(newWidth / aspectRatio, minH);
      break;
    case "tc":
      newHeight = Math.max(initialHeight - dy, minH);
      newY = initialY + (initialHeight - newHeight);
      if (shiftKey) newWidth = Math.max(newHeight * aspectRatio, minW);
      break;
    case "tr":
      newWidth = Math.max(initialWidth + dx, minW);
      newHeight = Math.max(initialHeight - dy, minH);
      newY = initialY + (initialHeight - newHeight);
      break;
    case "bl":
      newWidth = Math.max(initialWidth - dx, minW);
      newHeight = Math.max(initialHeight + dy, minH);
      newX = initialX + (initialWidth - newWidth);
      break;
  }

  // Apply shift constraint for corner handles: lock aspect ratio
  if (shiftKey && (handle === "br" || handle === "tl" || handle === "tr" || handle === "bl")) {
    // Use the larger dimension change to determine the constrained size
    const widthChange = Math.abs(newWidth - initialWidth);
    const heightChange = Math.abs(newHeight - initialHeight);

    if (widthChange >= heightChange) {
      newHeight = newWidth / aspectRatio;
    } else {
      newWidth = newHeight * aspectRatio;
    }

    // Recompute position for left/top handles after aspect-ratio fix
    if (handle === "tl" || handle === "tr" || handle === "bl") {
      if (handle === "tl") {
        newX = initialX + initialWidth - newWidth;
        newY = initialY + initialHeight - newHeight;
      } else if (handle === "tr") {
        newY = initialY + initialHeight - newHeight;
      } else if (handle === "bl") {
        newX = initialX + initialWidth - newWidth;
      }
    }

    // Enforce minimums
    newWidth = Math.max(newWidth, minW);
    newHeight = Math.max(newHeight, minH);
  }

  // For auto-height text (HEIGHT / WIDTH_AND_HEIGHT) the height always hugs content.
  // Ignore any dy-driven height delta — the visual height is recomputed in the commit handler.
  // Width-driven handles already set newWidth correctly; just clamp height back.
  const textAutoMode = state.textAutoResize;
  if (isText && textAutoMode && textAutoMode !== "NONE") {
    newHeight = initialHeight;
    // Reset Y drift introduced by top-corner tc/tl/tr calculations
    if (handle === "tl" || handle === "tr" || handle === "tc") {
      newY = initialY;
    }
    // Ensure alt-center logic still keeps Y centered (still handled below with corrected newHeight)
  }

  // Alt: resize from the center — keep the box's center fixed by re-centering
  // the computed box on the original center point.
  if (altKey) {
    const centerX = initialX + initialWidth / 2;
    const centerY = initialY + initialHeight / 2;
    newX = centerX - newWidth / 2;
    newY = centerY - newHeight / 2;
  }

  return { x: newX, y: newY, width: newWidth, height: newHeight };
}

export function getResizeCursor(state: ToolInteractionState): string {
  if (!state.resizeState) return "default";
  const { handle } = state.resizeState;
  if (handle === "tl" || handle === "br") return "nwse-resize";
  if (handle === "tr" || handle === "bl") return "nesw-resize";
  if (handle === "tc" || handle === "bc") return "ns-resize";
  if (handle === "ml" || handle === "mr") return "ew-resize";
  return "default";
}
