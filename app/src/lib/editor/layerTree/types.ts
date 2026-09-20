import type { LayerType } from "../../../context/EditorContext";

/**
 * The layer records the panel operates on.
 *
 * OpenPencil's scene graph hands out `SceneNode` objects whose child order is
 * intrinsic to the node; our document is a flat `LayerType[]` where array
 * position is the render order and `parentId` links a layer to its group.
 * `LayerNode` is the flat-model stand-in for that node type — the tree is a
 * *projection* built by `buildLayerTreeIndex` (see `./model`), not a migration.
 */
export type LayerNode = LayerType;

/** One flattened row of the layer tree, ready for the renderer / virtualizer. */
export interface LayerRow {
  /** Id of the layer this row renders. */
  id: string;
  /** 1-based depth; root-level layers are level 1. */
  level: number;
  /** True when the layer has children, i.e. it can be expanded / collapsed. */
  hasChildren: boolean;
}

/**
 * Selection intent for a click on a row.
 * - `additive` (Meta/Ctrl) toggles the target in/out of the current selection
 * - `range` (Shift) selects the contiguous slice from the anchor to the target
 */
export interface LayerSelectionMode {
  additive: boolean;
  range: boolean;
}

/**
 * Minimal virtualizer surface needed to scroll a row into view (Phase 3).
 *
 * Returns `false` when the virtualizer could not scroll — its viewport has no
 * measured height yet — so the panel can fall back to scrolling the row element
 * itself. `true` means the virtualizer handled it (including "already in view").
 */
export interface LayerTreeVirtualizer {
  scrollToIndex: (
    index: number,
    options?: { align?: "auto" | "center" | "end" | "start" },
  ) => boolean;
}

/**
 * Explicit drag & drop intent derived from the pointer position inside the
 * target row. Replaces the old implicit `above | below | inside` heuristic.
 */
export interface LayerDragInstruction {
  type: "reorder-above" | "reorder-below" | "make-child";
}
