import type { ElementProperties } from "../../editor-canvas/ElementsRenderer";
import { getElementBoundingBox } from "../../editor-canvas/ElementsRenderer";
import { alignItems, distributeItems, distributeItemsWithSpacing, alignItemsToFrame } from "../../../lib/editor/geometry";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shared input field component for the right sidebar */
type AlignmentAction = "left" | "centerH" | "right" | "top" | "centerV" | "bottom" | "distributeH" | "distributeV";

export type { AlignmentAction };

function applyAlignment(
  action: AlignmentAction,
  ids: string[],
  allElementProperties: Record<string, ElementProperties>,
  onMoveElement: (id: string, x: number, y: number) => void,
  frameBounds?: { x: number; y: number; width: number; height: number } | null,
) {
  if (ids.length === 0) return;

  const items = ids.map((id) => {
    const props = allElementProperties[id];
    return { id, x: props.x, y: props.y, bounds: getElementBoundingBox(props) };
  });
  const alignmentMap: Partial<Record<AlignmentAction, Parameters<typeof alignItems>[1]>> = {
    left: "left",
    centerH: "center-horizontal",
    right: "right",
    top: "top",
    centerV: "center-vertical",
    bottom: "bottom",
  };

  let positions: Record<string, { x: number; y: number }>;
  if (action === "distributeH" || action === "distributeV") {
    if (items.length < 3) return;
    positions = distributeItems(
      items,
      action === "distributeH" ? "horizontal" : "vertical",
    );
  } else {
    const alignment = alignmentMap[action];
    if (!alignment) return;
    // Two or more: align to the selection. Single layer: align to the frame
    // (B7) when a frame is available.
    positions =
      items.length >= 2
        ? alignItems(items, alignment)
        : frameBounds
          ? alignItemsToFrame(items, alignment, frameBounds)
          : {};
  }

  Object.entries(positions).forEach(([id, position]) => {
    onMoveElement(id, position.x, position.y);
  });
}

function applyDistributeSpacing(
  ids: string[],
  allElementProperties: Record<string, ElementProperties>,
  direction: "horizontal" | "vertical",
  gap: number,
  onMoveElement: (id: string, x: number, y: number) => void,
) {
  if (ids.length < 3) return;
  const items = ids.map((id) => {
    const props = allElementProperties[id];
    return { id, x: props.x, y: props.y, bounds: getElementBoundingBox(props) };
  });
  const positions = distributeItemsWithSpacing(items, direction, gap);
  Object.entries(positions).forEach(([id, position]) => {
    onMoveElement(id, position.x, position.y);
  });
}

// Numeric inspector inputs live in ./NumberField (draft/commit, expressions, scrub).
export { applyAlignment, applyDistributeSpacing };
