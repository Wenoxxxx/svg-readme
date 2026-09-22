import type { LayerType } from "../../../context/EditorContext";

/**
 * Component masters and instances.
 *
 * OpenPencil keeps a full component/instance model (masters, variants, swaps).
 * This app has no asset library, so the model is deliberately small but real:
 *
 * - **Create component** wraps the selection in a group flagged `isComponent`
 *   with a stable `componentId`. That group is the master.
 * - Duplicating a master produces an **instance** — a copy carrying the same
 *   `componentId` with `isComponent` cleared — so the link survives and the
 *   layer panel can show the instance badge, without a separate insert flow.
 *
 * The master is the source of truth: instances are identified by `componentId`,
 * and a `componentId` with no matching master means the copy is detached.
 */

export interface CreateComponentResult {
  updatedLayers: LayerType[];
  componentId: string;
  /** Id of the new master group layer. */
  masterId: string;
}

/**
 * Wrap the selected layers in a new component master.
 *
 * Same shape as `groupLayers`/`wrapInFrame`: the container inherits the first
 * selected layer's parent and takes its slot in the document, and the selection
 * is re-parented into it. Unlike grouping, a single layer is enough — that is
 * the common case (componentise this shape).
 *
 * Returns null when nothing in the selection exists in the document.
 */
export function createComponent(
  layers: LayerType[],
  selectedLayerIds: string[],
): CreateComponentResult | null {
  const selected = new Set(selectedLayerIds);
  if (selected.size === 0) return null;

  const firstIndex = layers.findIndex((layer) => selected.has(layer.id));
  if (firstIndex === -1) return null;

  const parentId = layers[firstIndex].parentId ?? null;
  const componentId = `component-${Date.now()}`;
  const masterId = componentId;
  const master: LayerType = {
    id: masterId,
    name: "Component",
    type: "group",
    locked: false,
    visible: true,
    parentId,
    collapsed: false,
    isComponent: true,
    componentId,
  };

  const reparented = layers.map((layer) =>
    selected.has(layer.id) ? { ...layer, parentId: masterId } : layer,
  );
  const updatedLayers = [...reparented];
  updatedLayers.splice(firstIndex, 0, master);

  return { updatedLayers, componentId, masterId };
}

/**
 * Mark duplicated component masters as instances.
 *
 * `duplicateLayersWithChildren` rebuilds ids as `<sourceId>-duplicate-<stamp>-<n>`,
 * so a copy can be traced back to its source by that prefix. Any copy whose
 * source was a master becomes an instance of that master's `componentId`
 * instead of a second master; everything else is returned untouched.
 */
export function linkInstancesToMasters(
  duplicatedLayers: LayerType[],
  sourceLayers: readonly LayerType[],
): LayerType[] {
  return duplicatedLayers.map((copy) => {
    const source = sourceLayers.find((candidate) =>
      copy.id.startsWith(`${candidate.id}-duplicate-`),
    );
    if (!source || source.isComponent !== true) return copy;

    return {
      ...copy,
      isComponent: false,
      componentId: source.componentId ?? source.id,
    };
  });
}
