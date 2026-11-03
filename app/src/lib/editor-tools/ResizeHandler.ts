import { MIN_SHAPE_SIZE, MIN_TEXTBOX_SIZE } from "../../components/editor-canvas/types";
import type { ElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import type { ResizeState } from "../../components/editor-canvas/types";
import type { ToolEventContext, ToolInteractionState } from "./types";
import { getTextAutoBox } from "../../lib/editor/textMeasure";
import type { Bounds, SnapGuideLine } from "../editor/geometry";

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

  const rotation = (props as { rotation?: number }).rotation ?? 0;

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
      rotation: Number.isFinite(rotation) ? rotation : 0,
      isLine: props.type === "shape" && props.kind === "line",
    },
  };
}

/**
 * Compute new position and dimensions during resize drag (deltas in the
 * element's LOCAL, unrotated frame).
 * - Shift keeps the aspect ratio. On an edge handle the other axis grows
 *   around its center (Figma behaviour) instead of from the top/left edge.
 * - Alt resizes from the element's center: the dragged edge moves by `d` and
 *   the opposite edge mirrors it, so the box grows by `2·d` (B3).
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
  // Lines may legitimately collapse to zero height/width (horizontal/vertical line).
  const minW = isText ? MIN_TEXTBOX_SIZE : state.isLine ? 0 : MIN_SHAPE_SIZE;
  const minH = isText ? MIN_TEXTBOX_SIZE : state.isLine ? 0 : MIN_SHAPE_SIZE;
  const aspectRatio = initialHeight > 0 ? initialWidth / initialHeight : 1;

  // Alt: both edges move, so the size changes twice as fast as the pointer.
  if (altKey) {
    dx *= 2;
    dy *= 2;
  }

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

  // Shift on an edge handle: the constrained (other) axis grows around its center.
  if (shiftKey) {
    if (handle === "ml" || handle === "mr") {
      newY = initialY + (initialHeight - newHeight) / 2;
    } else if (handle === "tc" || handle === "bc") {
      newX = initialX + (initialWidth - newWidth) / 2;
    }
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
    if (handle === "tl") {
      newX = initialX + initialWidth - newWidth;
      newY = initialY + initialHeight - newHeight;
    } else if (handle === "tr") {
      newY = initialY + initialHeight - newHeight;
    } else if (handle === "bl") {
      newX = initialX + initialWidth - newWidth;
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
    if (handle === "tl" || handle === "tr" || handle === "tc" || handle === "ml" || handle === "mr") {
      newY = initialY;
    }
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

/**
 * Rotation-aware resize. `worldDx/worldDy` is the pointer delta in canvas
 * (world) space. It is converted into the element's local frame, the box is
 * resized there, and the result is shifted so the handle opposite to the
 * dragged one stays put in WORLD space (elements rotate about their own
 * center, so a plain local resize would make the anchor drift).
 */
export function updateResizeWorld(
  state: NonNullable<ToolInteractionState["resizeState"]>,
  worldDx: number,
  worldDy: number,
  shiftKey = false,
  altKey = false,
): { x: number; y: number; width: number; height: number } {
  const rotation = state.rotation ?? 0;
  if (!rotation) return updateResize(state, worldDx, worldDy, shiftKey, altKey);

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Inverse-rotate the pointer delta into the local frame.
  const localDx = worldDx * cos + worldDy * sin;
  const localDy = -worldDx * sin + worldDy * cos;
  const box = updateResize(state, localDx, localDy, shiftKey, altKey);

  // Center offset in the unrotated frame…
  const vx = box.x + box.width / 2 - (state.initialX + state.initialWidth / 2);
  const vy = box.y + box.height / 2 - (state.initialY + state.initialHeight / 2);
  // …must be applied rotated in world space to keep the anchor fixed.
  const rvx = vx * cos - vy * sin;
  const rvy = vx * sin + vy * cos;
  return { ...box, x: box.x + (rvx - vx), y: box.y + (rvy - vy) };
}

/** Which box edges a resize handle moves. */
export function getMovingEdges(handle: ResizeHandle): {
  x: "left" | "right" | null;
  y: "top" | "bottom" | null;
} {
  const x = handle === "tl" || handle === "ml" || handle === "bl"
    ? "left"
    : handle === "tr" || handle === "mr" || handle === "br"
      ? "right"
      : null;
  const y = handle === "tl" || handle === "tc" || handle === "tr"
    ? "top"
    : handle === "bl" || handle === "bc" || handle === "br"
      ? "bottom"
      : null;
  return { x, y };
}

/**
 * Smart-guide snapping for a resize. Only the edges that the handle is
 * dragging are snapped — the anchored edge never moves. With Alt (resize
 * from center) both edges of an axis move symmetrically, so whichever edge
 * is closest to a guide snaps and the other mirrors it.
 */
export function snapResizeBox(
  box: Bounds,
  handle: ResizeHandle,
  siblings: Bounds[],
  options: { altKey?: boolean; threshold?: number; minSize?: number } = {},
): { box: Bounds; guides: SnapGuideLine[] } {
  const threshold = options.threshold ?? 5;
  const minSize = options.minSize ?? 0;
  const edges = getMovingEdges(handle);
  let { x, y, width, height } = box;
  const guides: SnapGuideLine[] = [];

  const findBest = (values: { edge: "start" | "end"; value: number }[], axis: "x" | "y") => {
    let best: { edge: "start" | "end"; delta: number; target: number; sibling: Bounds } | null = null;
    for (const sibling of siblings) {
      const targets = axis === "x"
        ? [sibling.x, sibling.x + sibling.width / 2, sibling.x + sibling.width]
        : [sibling.y, sibling.y + sibling.height / 2, sibling.y + sibling.height];
      for (const v of values) {
        for (const target of targets) {
          const delta = target - v.value;
          if (Math.abs(delta) > threshold) continue;
          if (!best || Math.abs(delta) < Math.abs(best.delta)) {
            best = { edge: v.edge, delta, target, sibling };
          }
        }
      }
    }
    return best;
  };

  if (edges.x) {
    const values: { edge: "start" | "end"; value: number }[] = options.altKey
      ? [{ edge: "start", value: x }, { edge: "end", value: x + width }]
      : [{ edge: edges.x === "left" ? "start" : "end", value: edges.x === "left" ? x : x + width }];
    const best = findBest(values, "x");
    if (best) {
      const d = best.delta;
      let nx: number;
      let nw: number;
      if (options.altKey) {
        if (best.edge === "end") { nw = width + 2 * d; nx = x - d; }
        else { nx = x + d; nw = width - 2 * d; }
      } else if (best.edge === "start") { nx = x + d; nw = width - d; }
      else { nx = x; nw = width + d; }
      if (nw >= minSize) {
        x = nx;
        width = nw;
        guides.push({
          orientation: "vertical",
          value: best.target,
          from: Math.min(y, best.sibling.y),
          to: Math.max(y + height, best.sibling.y + best.sibling.height),
        });
      }
    }
  }

  if (edges.y) {
    const values: { edge: "start" | "end"; value: number }[] = options.altKey
      ? [{ edge: "start", value: y }, { edge: "end", value: y + height }]
      : [{ edge: edges.y === "top" ? "start" : "end", value: edges.y === "top" ? y : y + height }];
    const best = findBest(values, "y");
    if (best) {
      const d = best.delta;
      let ny: number;
      let nh: number;
      if (options.altKey) {
        if (best.edge === "end") { nh = height + 2 * d; ny = y - d; }
        else { ny = y + d; nh = height - 2 * d; }
      } else if (best.edge === "start") { ny = y + d; nh = height - d; }
      else { ny = y; nh = height + d; }
      if (nh >= minSize) {
        y = ny;
        height = nh;
        guides.push({
          orientation: "horizontal",
          value: best.target,
          from: Math.min(x, best.sibling.x),
          to: Math.max(x + width, best.sibling.x + best.sibling.width),
        });
      }
    }
  }

  return { box: { x, y, width, height }, guides };
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
