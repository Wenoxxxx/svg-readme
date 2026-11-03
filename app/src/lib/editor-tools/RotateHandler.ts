import type { ToolEventContext, ToolInteractionState } from "./types";
import { canResize } from "./ResizeHandler";
import { getTextAutoBox } from "../editor/textMeasure";

/**
 * Start a rotate interaction. Returns the rotateState and initial angle.
 */
export function startRotate(
  ctx: ToolEventContext,
  elementId: string,
): Partial<ToolInteractionState> {
  const props = ctx.selectedProps;
  if (!props || !canResize(props)) return {};

  let w = typeof props.width === "number" ? props.width : 0;
  let h = typeof props.height === "number" ? props.height : 0;
  // Auto-width text stores width "auto" — pivot around the MEASURED box (the
  // same box the selection overlay and renderer use), not a 0-wide phantom.
  if (props.type === "text") {
    try {
      const box = getTextAutoBox(props as never, props.content);
      if (props.width === "auto" || w === 0) w = box.width;
      if ((props.textAutoResize ?? "WIDTH_AND_HEIGHT") !== "NONE") h = box.height;
    } catch {
      // keep stored values
    }
  }
  const centerX = props.x + w / 2;
  const centerY = props.y + h / 2;
  const dx = ctx.worldPoint.x - centerX;
  const dy = ctx.worldPoint.y - centerY;
  const startAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  return {
    rotateState: {
      elementId,
      centerX,
      centerY,
      startAngle,
      initialRotation: (props as { rotation?: number }).rotation ?? 0,
    },
  };
}

/**
 * Compute the new rotation angle during a rotate drag.
 * When shiftKey is true, snaps to nearest 15° increment.
 */
export function updateRotation(
  state: NonNullable<ToolInteractionState["rotateState"]>,
  worldX: number,
  worldY: number,
  shiftKey = false,
): number {
  const dx = worldX - state.centerX;
  const dy = worldY - state.centerY;
  const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  const angleDelta = currentAngle - state.startAngle;
  let newRotation = (state.initialRotation + angleDelta) % 360;
  if (newRotation < 0) newRotation += 360;

  // Shift: snap to nearest 15° increment
  if (shiftKey) {
    newRotation = Math.round(newRotation / 15) * 15;
  }

  return newRotation;
}

/**
 * Angle delta (degrees) between the drag start and the current pointer,
 * used to apply the same rotation increment to every element of a
 * multi-selection (B3).
 */
export function computeRotationDelta(
  state: NonNullable<ToolInteractionState["rotateState"]>,
  worldX: number,
  worldY: number,
): number {
  const dx = worldX - state.centerX;
  const dy = worldY - state.centerY;
  const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  return currentAngle - state.startAngle;
}

/**
 * Multi-selection rotate (Figma): every element gets the same rotation
 * increment AND its box center orbits the selection center by that angle.
 * Shift snaps the increment to 15°. Returns the next rotation and top-left
 * position per element id.
 */
export function computeMultiRotation(
  state: NonNullable<ToolInteractionState["rotateState"]>,
  worldX: number,
  worldY: number,
  shiftKey = false,
): Record<string, { rotation: number; x?: number; y?: number }> {
  let delta = computeRotationDelta(state, worldX, worldY);
  if (shiftKey) delta = Math.round(delta / 15) * 15;
  const rad = (delta * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const result: Record<string, { rotation: number; x?: number; y?: number }> = {};
  for (const id of state.selectionIds ?? []) {
    const initial = state.initialRotations?.[id] ?? 0;
    let rotation = (initial + delta) % 360;
    if (rotation < 0) rotation += 360;
    const pos = state.initialPositions?.[id];
    if (!pos) {
      result[id] = { rotation };
      continue;
    }
    const ox = pos.cx - state.centerX;
    const oy = pos.cy - state.centerY;
    const ncx = state.centerX + ox * cos - oy * sin;
    const ncy = state.centerY + ox * sin + oy * cos;
    result[id] = { rotation, x: pos.x + (ncx - pos.cx), y: pos.y + (ncy - pos.cy) };
  }
  return result;
}

/** MS Word style rotate cursor — circular arrow, like Word's rotation handle */
export const ROTATE_CURSOR =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 2v6h-6'/><path d='M21 13a9 9 0 1 1-3-7.7L21 8'/></svg>") 12 12, alias`;

export function getRotateCursor(_state: ToolInteractionState): string {
  return ROTATE_CURSOR;
}
