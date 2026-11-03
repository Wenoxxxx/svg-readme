import type { LayerType, FrameSize } from "../../context/EditorContext";
import type { ElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import { collectDescendantIds } from "./layerTree/model";
import { translatePoints } from "./pathUtils";

export interface DocumentSnapshot {
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
  selectedLayerIds: string[];
  /** Canvas (frame) size — included so resizes participate in undo/redo. */
  frameSize: FrameSize;
}

export interface DocumentHistory {
  past: DocumentSnapshot[];
  future: DocumentSnapshot[];
}

export interface HistoryTransition {
  history: DocumentHistory;
  snapshot: DocumentSnapshot | null;
}

/** Maximum number of undo snapshots kept in history (older entries are dropped). */
export const HISTORY_LIMIT = 100;

/**
 * Push a snapshot onto the undo stack, capping the stack at HISTORY_LIMIT.
 * No-op pushes are skipped: when the snapshot is identical to the current top
 * of the stack (e.g. focusing an input without changing its value), nothing is
 * added so undo isn't polluted with useless entries.
 *
 * Note: the no-op check serializes the top snapshot (JSON.stringify), which is
 * O(doc size) per push — fine for banner-sized documents; revisit with a cheap
 * fingerprint if documents grow large.
 */
export function pushHistory(
  past: DocumentSnapshot[],
  snapshot: DocumentSnapshot,
): DocumentSnapshot[] {
  const last = past[past.length - 1];
  if (last && JSON.stringify(last) === JSON.stringify(snapshot)) {
    return past;
  }
  return [...past, snapshot].slice(-HISTORY_LIMIT);
}

export function cloneDocumentSnapshot(snapshot: DocumentSnapshot): DocumentSnapshot {
  return {
    layers: snapshot.layers.map((layer) => ({ ...layer })),
    elementProperties: Object.fromEntries(
      Object.entries(snapshot.elementProperties).map(([id, properties]) => [id, { ...properties }]),
    ) as Record<string, ElementProperties>,
    selectedLayerIds: [...snapshot.selectedLayerIds],
    frameSize: { ...snapshot.frameSize },
  };
}

export function undoDocument(
  history: DocumentHistory,
  current: DocumentSnapshot,
): HistoryTransition {
  const previous = history.past.at(-1);
  if (!previous) return { history, snapshot: null };

  return {
    snapshot: cloneDocumentSnapshot(previous),
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, cloneDocumentSnapshot(current)],
    },
  };
}

export function redoDocument(
  history: DocumentHistory,
  current: DocumentSnapshot,
): HistoryTransition {
  const next = history.future.at(-1);
  if (!next) return { history, snapshot: null };

  return {
    snapshot: cloneDocumentSnapshot(next),
    history: {
      past: [...history.past, cloneDocumentSnapshot(current)],
      future: history.future.slice(0, -1),
    },
  };
}

export type ReorderDirection = "forward" | "backward" | "front" | "back";

/**
 * Group the selected layers into a new group layer.
 * Only layers at the same parent level can be grouped together.
 * Returns null if grouping is not possible (< 2 layers selected).
 */
export interface GroupResult {
  groupLayer: LayerType;
  updatedLayers: LayerType[];
}

export function groupLayers(
  layers: LayerType[],
  selectedLayerIds: string[],
): GroupResult | null {
  const selected = new Set(selectedLayerIds);
  if (selected.size < 2) return null;

  // Find the first selected layer to determine insertion position and parent
  const firstSelectedIndex = layers.findIndex((l) => selected.has(l.id));
  if (firstSelectedIndex === -1) return null;

  const parentId = layers[firstSelectedIndex].parentId ?? null;

  // All selected layers must share the same parent
  const allSameParent = selectedLayerIds.every((id) => {
    const layer = layers.find((l) => l.id === id);
    return layer && (layer.parentId ?? null) === parentId;
  });
  if (!allSameParent) return null;

  // Create the group layer
  const groupId = `group-${Date.now()}`;
  const groupLayer: LayerType = {
    id: groupId,
    name: "Group",
    type: "group",
    locked: false,
    visible: true,
    parentId,
    collapsed: false,
  };

  // Update selected layers to point to the new group
  const updatedLayers = layers.map((layer) => {
    if (selected.has(layer.id)) {
      return { ...layer, parentId: groupId, active: false };
    }
    return layer;
  });

  // Insert the group layer at the position of the first selected layer
  const result = [...updatedLayers];
  result.splice(firstSelectedIndex, 0, groupLayer);

  return { groupLayer, updatedLayers: result };
}

/**
 * Ungroup a group layer, moving its children to the group's parent level.
 * Returns null if the layer is not a group.
 */
export interface UngroupResult {
  updatedLayers: LayerType[];
  childIds: string[];
}

export function ungroupLayer(
  layers: LayerType[],
  groupId: string,
): UngroupResult | null {
  const groupLayer = layers.find((l) => l.id === groupId);
  if (!groupLayer || groupLayer.type !== "group") return null;

  const groupIndex = layers.findIndex((l) => l.id === groupId);
  if (groupIndex === -1) return null;

  const parentId = groupLayer.parentId ?? null;

  // Find all children and move them to the group's parent
  const childIds: string[] = [];
  const updatedLayers = layers.flatMap((layer) => {
    if (layer.id === groupId) return []; // Remove the group itself
    if ((layer.parentId ?? null) === groupId) {
      childIds.push(layer.id);
      return [{ ...layer, parentId }];
    }
    return [layer];
  });

  return { updatedLayers, childIds };
}

/**
 * Check if selected layers can be grouped (same parent, >= 2 non-group leaf layers).
 */
export function canGroupLayers(
  layers: readonly LayerType[],
  selectedLayerIds: readonly string[],
): boolean {
  if (selectedLayerIds.length < 2) return false;
  const selectedLayers = layers.filter((l) => selectedLayerIds.includes(l.id));
  const firstParent = selectedLayers[0]?.parentId ?? null;
  return selectedLayers.every((l) => (l.parentId ?? null) === firstParent);
}

export interface DuplicateResult {
  duplicatedLayers: LayerType[];
  duplicatedProperties: Record<string, ElementProperties>;
  duplicatedTopIds: string[];
}

/**
 * Duplicate a set of layers (the selection PLUS all of its descendants) with
 * freshly generated ids. Every copied layer's `parentId` is remapped through
 * the old→new id map, so duplicated children stay nested under their
 * duplicated group instead of pointing back at the original group (the A7
 * nested-layer correctness fix). Path geometry (points/handles/subpaths) is
 * shifted by (offsetX, offsetY) so the copy is visible next to the original.
 *
 * Returns null when nothing can be duplicated.
 */
export function duplicateLayersWithChildren(
  layers: LayerType[],
  elementProperties: Record<string, ElementProperties>,
  selectedLayerIds: string[],
  offsetX = 20,
  offsetY = 20,
): DuplicateResult | null {
  if (selectedLayerIds.length === 0) return null;

  // Collect ALL layers to duplicate: selection + all descendants
  const toDuplicate = new Set(selectedLayerIds);
  const collectDescendants = (parentId: string) => {
    layers.forEach((l) => {
      if ((l.parentId ?? null) === parentId) {
        toDuplicate.add(l.id);
        collectDescendants(l.id);
      }
    });
  };
  [...selectedLayerIds].forEach((id) => collectDescendants(id));

  // Build old→new id map, then duplicate layers with remapped parentId
  const stamp = Date.now();
  const idMap = new Map<string, string>();
  let idx = 0;
  for (const id of toDuplicate) {
    idMap.set(id, `${id}-duplicate-${stamp}-${idx++}`);
  }

  const duplicatedLayers: LayerType[] = [];
  const duplicatedProperties: Record<string, ElementProperties> = {};
  const duplicatedTopIds: string[] = [];

  for (const originalId of toDuplicate) {
    const layer = layers.find((item) => item.id === originalId);
    if (!layer) continue;
    const newId = idMap.get(originalId)!;

    duplicatedLayers.push({
      ...layer,
      id: newId,
      active: true,
      parentId: layer.parentId
        ? (idMap.get(layer.parentId) ?? layer.parentId)
        : layer.parentId,
    });

    const originalProps = elementProperties[originalId];
    if (originalProps) {
      // Paths store their geometry in absolute points — shift them too.
      if (originalProps.type === "path") {
        const { points, handles, bounds, subpaths } = translatePoints(
          originalProps.points,
          offsetX,
          offsetY,
          originalProps.handles,
          originalProps.subpaths,
        );
        duplicatedProperties[newId] = {
          ...originalProps,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          points,
          handles,
          subpaths,
        };
      } else {
        duplicatedProperties[newId] = {
          ...originalProps,
          x: (originalProps.x as number) + offsetX,
          y: (originalProps.y as number) + offsetY,
        };
      }
    }

    // Track top-level duplicated layers (those in the original selection)
    if (selectedLayerIds.includes(originalId)) {
      duplicatedTopIds.push(newId);
    }
  }

  if (duplicatedLayers.length === 0) return null;
  return { duplicatedLayers, duplicatedProperties, duplicatedTopIds };
}

/** Reorder one sibling list (back-to-front) for the given direction. */
function reorderSiblings(
  siblings: LayerType[],
  selected: ReadonlySet<string>,
  direction: ReorderDirection,
): LayerType[] {
  if (direction === "front") {
    return [...siblings.filter((layer) => !selected.has(layer.id)), ...siblings.filter((layer) => selected.has(layer.id))];
  }
  if (direction === "back") {
    return [...siblings.filter((layer) => selected.has(layer.id)), ...siblings.filter((layer) => !selected.has(layer.id))];
  }

  const result = [...siblings];
  if (direction === "forward") {
    for (let index = result.length - 2; index >= 0; index -= 1) {
      if (!selected.has(result[index].id) || selected.has(result[index + 1].id)) continue;
      [result[index], result[index + 1]] = [result[index + 1], result[index]];
    }
    return result;
  }

  for (let index = 1; index < result.length; index += 1) {
    if (!selected.has(result[index].id) || selected.has(result[index - 1].id)) continue;
    [result[index - 1], result[index]] = [result[index], result[index - 1]];
  }
  return result;
}

/**
 * Change the z-order of the selected layers.
 *
 * Z-order is sibling order: the renderer walks the tree and paints each
 * parent's children in array order. So every move happens *among siblings*
 * only — a layer never jumps over a layer that belongs to another group. Each
 * parent's children are reordered on their own and written back into the
 * array slots that parent's children already occupied, which leaves every
 * other layer (and every descendant, linked by `parentId`) where it was.
 */
export function reorderSelectedLayers(
  layers: LayerType[],
  selectedLayerIds: string[],
  direction: ReorderDirection,
): LayerType[] {
  const selected = new Set(selectedLayerIds);
  if (selected.size === 0) return layers;

  const slotsByParent = new Map<string | null, number[]>();
  layers.forEach((layer, index) => {
    const parentId = layer.parentId ?? null;
    const slots = slotsByParent.get(parentId);
    if (slots) slots.push(index);
    else slotsByParent.set(parentId, [index]);
  });

  const result = [...layers];
  let changed = false;
  for (const slots of slotsByParent.values()) {
    const siblings = slots.map((index) => layers[index]);
    if (!siblings.some((layer) => selected.has(layer.id))) continue;
    const reordered = reorderSiblings(siblings, selected, direction);
    slots.forEach((slot, k) => {
      if (result[slot] !== reordered[k]) changed = true;
      result[slot] = reordered[k];
    });
  }
  return changed ? result : layers;
}

/**
 * Move `sourceId` under `parentId` at the given sibling slot.
 *
 * The one operation the layer panel's drag & drop needs: it re-parents the
 * layer and repositions it in the flat document order, which is what the tree
 * projection reads to work out sibling order. `index` is the slot among the
 * parent's children *after* the source has been detached (that is exactly what
 * `resolveDropTarget` produces).
 *
 * Invalid moves are rejected by returning the input unchanged — the source
 * itself, into its own subtree, or onto a parent that does not exist.
 */
export function reorderChild(
  layers: LayerType[],
  sourceId: string,
  parentId: string | null,
  index: number,
): LayerType[] {
  const source = layers.find((layer) => layer.id === sourceId);
  if (!source) return layers;

  if (parentId !== null) {
    if (parentId === sourceId) return layers;
    if (!layers.some((layer) => layer.id === parentId)) return layers;
    if (collectDescendantIds(layers, sourceId).includes(parentId)) return layers;
  }

  const remaining = layers.filter((layer) => layer.id !== sourceId);
  const siblings = remaining.filter(
    (layer) => (layer.parentId ?? null) === parentId,
  );
  const slot = Math.max(0, Math.min(index, siblings.length));

  let insertAt: number;
  if (slot < siblings.length) {
    // In front of the sibling currently occupying the slot.
    insertAt = remaining.indexOf(siblings[slot]);
  } else if (siblings.length > 0) {
    // Appending: just after the last sibling. Sibling order is what the tree
    // projection reads, and inserting directly after the last sibling keeps the
    // source last without having to walk that sibling's subtree.
    insertAt = remaining.indexOf(siblings[siblings.length - 1]) + 1;
  } else if (parentId !== null) {
    // First child of an empty parent: keep it next to its new parent.
    insertAt = remaining.findIndex((layer) => layer.id === parentId) + 1;
  } else {
    insertAt = remaining.length;
  }

  return [
    ...remaining.slice(0, insertAt),
    { ...source, parentId },
    ...remaining.slice(insertAt),
  ];
}

export interface DeleteLayersResult {
  updatedLayers: LayerType[];
  updatedProperties: Record<string, ElementProperties>;
  /** Every removed id: the deletable targets plus all their descendants. */
  deletedIds: string[];
}

/**
 * The single delete path (menu Delete, Backspace, layer-row trash).
 *
 * Locked targets are skipped rather than blocking the whole operation, so a
 * mixed selection deletes its unlocked layers. Each deleted layer takes its
 * whole subtree and the element properties of every removed id with it.
 * Returns null when nothing is deletable.
 */
export function deleteLayers(
  layers: LayerType[],
  elementProperties: Record<string, ElementProperties>,
  targetIds: readonly string[],
): DeleteLayersResult | null {
  const byId = new Map(layers.map((layer) => [layer.id, layer]));
  const doomed = new Set<string>();
  for (const id of targetIds) {
    const layer = byId.get(id);
    if (!layer || layer.locked) continue;
    doomed.add(id);
    for (const child of collectDescendantIds(layers, id)) doomed.add(child);
  }
  if (doomed.size === 0) return null;

  const updatedProperties = { ...elementProperties };
  for (const id of doomed) delete updatedProperties[id];
  return {
    updatedLayers: layers.filter((layer) => !doomed.has(layer.id)),
    updatedProperties,
    deletedIds: [...doomed],
  };
}
