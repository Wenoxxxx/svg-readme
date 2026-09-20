import { getTextAutoBox } from "../../lib/editor/textMeasure";
import type { TextElementProperties, ShapeElementProperties, ImageElementProperties, PathElementProperties, ElementProperties } from "./elementTypes";

// ─── Bounding Box Helpers ─────────────────────────────────────────────────────

/**
 * Build a bounding box rect for a text element in absolute world coordinates.
 * x,y is the top-left corner of the textbox (matches Open Pencil's node position).
 * This is used for rubber-band selection and snap guides.
 *
 * Box geometry comes from getTextAutoBox (measured via canvas when available,
 * heuristic fallback otherwise) so selection/snap agree with the rendered text (A11).
 */
export function getTextBoundingBox(props: TextElementProperties) {
  try {
    const { width: boxWidth, height: boxHeight } = getTextAutoBox(props, props.content);
    const x = typeof props.x === "number" && Number.isFinite(props.x) ? props.x : 0;
    const y = typeof props.y === "number" && Number.isFinite(props.y) ? props.y : 0;
    return {
      x: x - 2,
      y: y - 2,
      width: (typeof boxWidth === "number" && Number.isFinite(boxWidth) ? boxWidth : 20) + 4,
      height: (typeof boxHeight === "number" && Number.isFinite(boxHeight) ? boxHeight : 20) + 4,
    };
  } catch {
    const x = typeof (props as { x?: unknown }).x === "number" ? (props as { x: number }).x : 0;
    const y = typeof (props as { y?: unknown }).y === "number" ? (props as { y: number }).y : 0;
    return { x: x - 2, y: y - 2, width: 24, height: 24 };
  }
}

/** Bounding box for a shape element (same coords as the shape itself). */
export function getShapeBoundingBox(props: ShapeElementProperties) {
  return { x: props.x, y: props.y, width: props.width, height: props.height };
}

/** Bounding box for an image element (same coords as the image itself). */
export function getImageBoundingBox(props: ImageElementProperties) {
  return { x: props.x, y: props.y, width: props.width, height: props.height };
}

/** Bounding box for a path element (same coords as the path itself). */
export function getPathBoundingBox(props: PathElementProperties) {
  return { x: props.x, y: props.y, width: props.width, height: props.height };
}

/** Compute bounding box from raw points array. Used when creating a new path. */
export function computePathBounds(points: [number, number][]): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of points) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Returns bounding box for any element type — used for rubber-band selection */
export function getElementBoundingBox(props: ElementProperties) {
  try {
    if (props.type === "text") return getTextBoundingBox(props);
    if (props.type === "image") return getImageBoundingBox(props);
    if (props.type === "path") return getPathBoundingBox(props);
    return getShapeBoundingBox(props);
  } catch {
    const x = typeof (props as { x?: unknown }).x === "number" ? (props as { x: number }).x : 0;
    const y = typeof (props as { y?: unknown }).y === "number" ? (props as { y: number }).y : 0;
    return { x, y, width: 20, height: 20 };
  }
}
