import type { LayerType } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";
import { duplicateLayersWithChildren } from "../documentActions";

/**
 * The two clipboard commands the reference menu exposes beyond plain Copy/Cut.
 *
 * Figma parity:
 * - **Paste here** places the copies at the coordinates they were copied from
 *   (no cascade offset), keeping their original parent when it still exists.
 * - **Paste to replace** swaps each selected layer for the matching clipboard
 *   layer, 1:1 — the capability layer already refuses mismatched counts.
 *
 * Both are pure: they take the document and the clipboard payload and return
 * the next document, so the caller owns history and selection.
 */

export interface ClipboardPayload {
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
}

/**
 * Whether the browser exposes a readable clipboard.
 *
 * The internal clipboard is only one half of the story: the OS clipboard can
 * hold a payload this app never captured (another tab, another document), and
 * it cannot be inspected synchronously. This is the closest honest answer to
 * "might there be something to paste?", and it is what enables Paste here
 * before this app has copied anything itself.
 */
export function isClipboardReadable(): boolean {
  if (typeof navigator === "undefined") return false;
  const clipboard = (navigator as Navigator).clipboard as
    | (Clipboard & { read?: unknown })
    | undefined;
  return typeof clipboard?.read === "function";
}

/** True when a paste command has something it could paste. */
export function hasPasteSource(internalClipboardCount: number): boolean {
  return internalClipboardCount > 0 || isClipboardReadable();
}

export interface ClipboardOpResult {
  updatedLayers: LayerType[];
  updatedProperties: Record<string, ElementProperties>;
  /** The pasted/replacing layers, which become the selection. */
  selectedIds: string[];
}

/** Every layer in `layers`, plus everything nested under the given roots. */
function collectSubtreeIds(
  layers: readonly LayerType[],
  roots: readonly string[],
): Set<string> {
  const ids = new Set(roots);
  let grew = true;
  while (grew) {
    grew = false;
    for (const layer of layers) {
      const parentId = layer.parentId ?? null;
      if (parentId && ids.has(parentId) && !ids.has(layer.id)) {
        ids.add(layer.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Top-level layers of a payload: those whose parent is not also being copied. */
function payloadTopLevel(clip: ClipboardPayload): LayerType[] {
  const clipIds = new Set(clip.layers.map((layer) => layer.id));
  return clip.layers.filter((layer) => {
    const parentId = layer.parentId ?? null;
    return parentId === null || !clipIds.has(parentId);
  });
}

/**
 * Paste the clipboard without the cascade offset.
 *
 * Reuses `duplicateLayersWithChildren` with a zero offset, so nesting, id
 * remapping and path-geometry handling all stay in one place; the copies keep
 * whatever parent the source had.
 */
export function pasteInPlace(
  layers: LayerType[],
  elementProperties: Record<string, ElementProperties>,
  clip: ClipboardPayload,
): ClipboardOpResult | null {
  if (clip.layers.length === 0) return null;

  // The ids in the payload belong to the clipboard, not to this document, so
  // the duplicate runs against the payload itself and the result is appended.
  const result = duplicateLayersWithChildren(
    clip.layers,
    clip.elementProperties,
    clip.layers.map((layer) => layer.id),
    0,
    0,
  );
  if (!result) return null;

  const topIds = new Set(result.duplicatedTopIds);
  const duplicatedLayers = result.duplicatedLayers.map((layer) =>
    topIds.has(layer.id) ? layer : { ...layer, active: false },
  );

  return {
    updatedLayers: [...layers, ...duplicatedLayers],
    updatedProperties: {
      ...elementProperties,
      ...result.duplicatedProperties,
    },
    selectedIds: result.duplicatedTopIds,
  };
}

/**
 * Replace the selected layers with the clipboard's, 1:1.
 *
 * Each replacement takes its target's slot and parent, and brings the clipboard
 * layer's own geometry with it — "replace this with what I copied". The target
 * and its descendants are removed.
 *
 * Returns null when the two sides do not line up or there is nothing to do.
 */
export function replaceLayers(
  layers: LayerType[],
  elementProperties: Record<string, ElementProperties>,
  targetIds: readonly string[],
  clip: ClipboardPayload,
): ClipboardOpResult | null {
  if (targetIds.length === 0 || clip.layers.length === 0) return null;

  const sources = payloadTopLevel(clip);
  if (sources.length !== targetIds.length) return null;

  const targets = targetIds
    .map((id) => layers.find((layer) => layer.id === id))
    .filter((layer): layer is LayerType => layer !== undefined);
  if (targets.length !== targetIds.length) return null;

  // Both sides are consumed in order, so target i is replaced by source i.
  const sourceByTarget = new Map(
    targets.map((target, index) => [target.id, sources[index]]),
  );

  const removed = collectSubtreeIds(layers, targetIds);
  const stamp = Date.now();
  const idMap = new Map<string, string>();
  const updatedProperties: Record<string, ElementProperties> = { ...elementProperties };
  const selectedIds: string[] = [];
  let counter = 0;

  /** Build the replacement subtree for one target, in payload document order. */
  const buildSubtree = (source: LayerType, target: LayerType): LayerType[] => {
    const subtreeIds = collectSubtreeIds(clip.layers, [source.id]);
    return clip.layers
      .filter((layer) => subtreeIds.has(layer.id))
      .map((layer) => {
        const newId = `${layer.id}-replaced-${stamp}-${counter++}`;
        idMap.set(layer.id, newId);

        const isTop = layer.id === source.id;
        const parentId = isTop
          ? (target.parentId ?? null)
          : (idMap.get(layer.parentId ?? "") ?? target.parentId ?? null);

        const clipProps = clip.elementProperties[layer.id];
        if (clipProps) updatedProperties[newId] = { ...clipProps };

        return {
          ...layer,
          id: newId,
          parentId,
          active: isTop,
        };
      });
  };

  const updatedLayers: LayerType[] = [];
  for (const layer of layers) {
    // A replaced target emits its replacement subtree in its own slot.
    if (removed.has(layer.id)) {
      const source = sourceByTarget.get(layer.id);
      if (!source) continue; // a descendant of a replaced target — dropped
      const subtree = buildSubtree(source, layer);
      selectedIds.push(subtree[0].id);
      updatedLayers.push(...subtree);
      continue;
    }
    updatedLayers.push(layer);
  }

  // Anything the walk never reached (a target after its own descendant in the
  // document order) still has to be removed.
  const cleanedProperties: Record<string, ElementProperties> = {};
  for (const [id, value] of Object.entries(updatedProperties)) {
    if (removed.has(id)) continue;
    cleanedProperties[id] = value;
  }

  if (selectedIds.length === 0) return null;

  return {
    updatedLayers,
    updatedProperties: cleanedProperties,
    selectedIds,
  };
}
