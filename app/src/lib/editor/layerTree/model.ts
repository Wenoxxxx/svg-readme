import type { LayerType } from "../../../context/EditorContext";
import type { LayerNode, LayerRow, LayerSelectionMode } from "./types";

/**
 * Flat document → tree projection.
 *
 * `LayerType[]` stores the document flat: array position is the render order and
 * `parentId` links a layer to its group. The index groups those ids by parent
 * while preserving document order inside each group, so a tree can be rendered
 * without mutating the source array.
 */
export interface LayerTreeIndex {
  /** Ordered child ids per parent; `null` holds the root-level ids. */
  byParent: Map<string | null, string[]>;
  /** Every layer in the document, keyed by id. */
  byId: Map<string, LayerNode>;
  /** Root-level ids in document (array) order. */
  roots: string[];
}

/**
 * Resolve a layer's effective parent id, tolerating inconsistent documents.
 *
 * A layer whose `parentId` is missing, points at itself, or sits on a cycle is
 * promoted to the root level instead of being silently dropped from the tree.
 */
function resolveParentId(
  layer: LayerType,
  byId: ReadonlyMap<string, LayerType>,
): string | null {
  const parentId = layer.parentId ?? null;
  if (parentId === null || parentId === layer.id) return null;

  const parent = byId.get(parentId);
  if (!parent) return null;

  // Walk up the chain to make sure it terminates.
  const seen = new Set<string>([layer.id]);
  let cursor: string | null = parentId;
  while (cursor !== null) {
    if (seen.has(cursor)) return null;
    seen.add(cursor);
    const node: LayerType | undefined = byId.get(cursor);
    if (!node) return null;
    cursor = node.parentId ?? null;
  }
  return parentId;
}

/**
 * Project the flat layer list into parent → children lookups plus root order.
 *
 * Layers keep their document order inside `byParent`, which is what makes the
 * flattened rows match the array order the rest of the editor relies on.
 */
export function buildLayerTreeIndex(
  layers: readonly LayerType[],
): LayerTreeIndex {
  const byId = new Map<string, LayerNode>();
  for (const layer of layers) byId.set(layer.id, layer);

  const byParent = new Map<string | null, string[]>();
  const roots: string[] = [];

  for (const layer of layers) {
    const parentId = resolveParentId(layer, byId);
    if (parentId === null) {
      roots.push(layer.id);
      continue;
    }
    const siblings = byParent.get(parentId);
    if (siblings) siblings.push(layer.id);
    else byParent.set(parentId, [layer.id]);
  }

  return { byParent, byId, roots };
}

/**
 * Flatten the tree into rows. A layer's children are only emitted while the
 * layer's id is in `expandedIds`, so collapsed subtrees are skipped entirely.
 * Every id is emitted at most once even for malformed input.
 */
export function visibleLayerRows(
  roots: readonly string[],
  byParent: ReadonlyMap<string | null, readonly string[]>,
  expandedIds: ReadonlySet<string>,
): LayerRow[] {
  const rows: LayerRow[] = [];
  const seen = new Set<string>();

  const append = (ids: readonly string[], level: number) => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);

      const childIds = byParent.get(id) ?? [];
      const hasChildren = childIds.length > 0;
      rows.push({ id, level, hasChildren });

      if (hasChildren && expandedIds.has(id)) append(childIds, level + 1);
    }
  };

  append(roots, 1);
  return rows;
}

/**
 * Selection arithmetic for a click on `targetId`.
 *
 * Ported from OpenPencil's `layerSelectionForTarget`:
 * - plain click replaces the selection with the target
 * - additive (Ctrl/Cmd) toggles the target
 * - range (Shift) selects the visible slice between the anchor and the target;
 *   when the anchor is gone (deleted, collapsed away) it degrades to a plain
 *   click rather than selecting everything in between
 */
export function layerSelectionForTarget(
  visibleIds: readonly string[],
  currentIds: ReadonlySet<string>,
  anchorId: string | null,
  targetId: string,
  mode: LayerSelectionMode,
): Set<string> {
  if (!mode.range || !anchorId) {
    if (!mode.additive) return new Set([targetId]);
    const next = new Set(currentIds);
    if (next.has(targetId)) next.delete(targetId);
    else next.add(targetId);
    return next;
  }

  const anchorIndex = visibleIds.indexOf(anchorId);
  const targetIndex = visibleIds.indexOf(targetId);
  if (anchorIndex === -1 || targetIndex === -1) return new Set([targetId]);

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  const next: Set<string> = mode.additive ? new Set(currentIds) : new Set<string>();
  for (let index = start; index <= end; index++) {
    const id = visibleIds[index];
    if (id !== undefined) next.add(id);
  }
  return next;
}

/**
 * All descendants of `id` in document order (depth-first, pre-order), excluding
 * `id` itself. Used to block dropping a layer into its own subtree.
 */
export function collectDescendantIds(
  layers: readonly LayerType[],
  id: string,
): string[] {
  const { byParent } = buildLayerTreeIndex(layers);
  const descendants: string[] = [];
  const seen = new Set<string>();

  const append = (parentId: string) => {
    for (const childId of byParent.get(parentId) ?? []) {
      if (seen.has(childId)) continue;
      seen.add(childId);
      descendants.push(childId);
      append(childId);
    }
  };

  append(id);
  return descendants;
}
