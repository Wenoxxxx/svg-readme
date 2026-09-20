import type { LayerType } from "../../../context/EditorContext";
import { collectDescendantIds } from "./model";
import type { LayerDragInstruction } from "./types";

/**
 * Pure drag & drop decision layer for the layer panel.
 *
 * Ported from OpenPencil's `useLayerDrag.ts`: the pointer position inside a row
 * resolves to an explicit `reorder-above | reorder-below | make-child`
 * instruction, that instruction resolves to a `(parentId, index)` drop target,
 * and descendant drops are rejected outright. Everything here is pure so the
 * whole interaction can be tested without simulating real drag events.
 */

/** Fraction of a row's height that forms its top / bottom reorder edge. */
export const LAYER_DROP_EDGE_RATIO = 1 / 3;

export interface DragInstructionInput {
  /** Pointer offset from the top of the target row, in CSS pixels. */
  offsetY: number;
  /** Rendered height of the target row, in CSS pixels. */
  rowHeight: number;
  /**
   * True when the target can adopt the dragged layer (i.e. is a group).
   * An *empty* group is still a container, so this is the target's type rather
   * than whether it currently has children.
   */
  targetIsContainer: boolean;
}

/**
 * Resolve the pointer position inside a row to a drop instruction.
 *
 * - top third → `reorder-above`
 * - bottom third → `reorder-below`
 * - middle third → `make-child` for a container, otherwise whichever half of
 *   the row the pointer is closest to (a leaf can never adopt a child).
 */
export function resolveDragInstruction({
  offsetY,
  rowHeight,
  targetIsContainer,
}: DragInstructionInput): LayerDragInstruction {
  // An un-laid-out row (jsdom, `display: none`) has no meaningful zones.
  if (rowHeight <= 0) return { type: "reorder-below" };

  const edge = rowHeight * LAYER_DROP_EDGE_RATIO;
  if (offsetY < edge) return { type: "reorder-above" };
  if (offsetY > rowHeight - edge) return { type: "reorder-below" };

  if (targetIsContainer) return { type: "make-child" };
  return offsetY < rowHeight / 2
    ? { type: "reorder-above" }
    : { type: "reorder-below" };
}

/**
 * True when `targetId` may receive `sourceId` — false for the source itself and
 * for any layer inside the source's own subtree (which would orphan the tree).
 */
export function canDropOnLayer(
  layers: readonly LayerType[],
  sourceId: string | null,
  targetId: string,
): boolean {
  if (!sourceId || sourceId === targetId) return false;
  return !collectDescendantIds(layers, sourceId).includes(targetId);
}

/** Where a drop lands: the parent to re-parent into and the slot among its children. */
export interface LayerDropTarget {
  parentId: string | null;
  /**
   * Slot among the parent's children *after* the source has been detached, so
   * it can be handed straight to `documentActions.reorderChild`.
   */
  index: number;
}

/**
 * Resolve an instruction + target row into the `(parentId, index)` a reorder
 * operation needs.
 *
 * `reorder-above` / `reorder-below` keep the target's parent and slot the
 * source next to it; `make-child` appends to the target's children. The index
 * is computed against the sibling list *without* the source, because moving a
 * layer removes it before it is re-inserted.
 */
export function resolveDropTarget(options: {
  sourceId: string;
  targetId: string;
  instruction: LayerDragInstruction;
  /** Normalised parent per layer id (`null` for root-level layers). */
  parentById: ReadonlyMap<string, string | null>;
  /** Ordered child ids per parent (root-level layers live in `rootIds`). */
  childIdsByParent: ReadonlyMap<string | null, readonly string[]>;
  /** Root-level ids in document order. */
  rootIds: readonly string[];
}): LayerDropTarget | null {
  const { sourceId, targetId, instruction, parentById, childIdsByParent, rootIds } =
    options;

  if (instruction.type === "make-child") {
    const children = childIdsByParent.get(targetId) ?? [];
    return {
      parentId: targetId,
      index: children.filter((id) => id !== sourceId).length,
    };
  }

  const parentId = parentById.get(targetId) ?? null;
  const siblings =
    parentId === null ? rootIds : (childIdsByParent.get(parentId) ?? []);
  const targetIndex = siblings.indexOf(targetId);
  if (targetIndex === -1) return null;

  // Detaching the source shifts the target's slot when the source sits before it.
  const sourceIndex = siblings.indexOf(sourceId);
  const slot =
    sourceIndex !== -1 && sourceIndex < targetIndex
      ? targetIndex - 1
      : targetIndex;

  return {
    parentId,
    index: instruction.type === "reorder-below" ? slot + 1 : slot,
  };
}
