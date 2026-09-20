import type { LayerType } from "../../context/EditorContext";
import type { ElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import { canGroupLayers } from "./documentActions";

/**
 * Everything needed to answer "what is allowed on the current selection".
 *
 * Ported from OpenPencil's `selection-capabilities/use` — a single source of
 * truth for menus, shortcuts and toolbar buttons, so capability rules are not
 * re-derived (and eventually desynced) per call site.
 */
export interface SelectionCapabilities {
  /** True when at least one layer is selected. */
  hasSelection: boolean;
  /** How many selected layers exist (counted against the document, not the raw id list). */
  selectedCount: number;
  canDuplicate: boolean;
  canDelete: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canWrapInFrame: boolean;
  canFlatten: boolean;
  /** ≥2 selected shape/path layers — enables real boolean ops. */
  canBoolean: boolean;
  /** The selection contains a text layer with element properties — enables Outline Text. */
  canOutlineText: boolean;
  /** The selection contains a shape/path layer with element properties — enables Outline Stroke. */
  canOutlineStroke: boolean;
  /** A selected shape/text layer inside a group can act as a mask. */
  canMask: boolean;
  canReorder: boolean;
  canToggleVisibility: boolean;
  canToggleLock: boolean;
  canCopyAsPng: boolean;
}

export interface SelectionCapabilitiesInput {
  layers: readonly LayerType[];
  selectedLayerIds: readonly string[];
  elementProperties?: Readonly<Record<string, ElementProperties>>;
}

/**
 * Compute the capability set for a selection.
 *
 * Pure and document-order independent: it only reads the layers referenced by
 * `selectedLayerIds`, so callers can pass the panel's `active`-filtered ids or
 * the editor's `selectedLayerIds` interchangeably.
 */
export function computeSelectionCapabilities(
  input: SelectionCapabilitiesInput,
): SelectionCapabilities {
  const { layers, selectedLayerIds, elementProperties = {} } = input;

  const selectedSet = new Set(selectedLayerIds);
  const selectedLayers = layers.filter((layer) => selectedSet.has(layer.id));
  const selectedCount = selectedLayers.length;
  const hasSelection = selectedCount > 0;

  const selectedProperties = selectedLayers.map((layer) => elementProperties[layer.id]);
  const shapeOrPathCount = selectedProperties.filter(
    (properties) =>
      properties?.type === "shape" || properties?.type === "path",
  ).length;
  const textCount = selectedProperties.filter(
    (properties) => properties?.type === "text",
  ).length;

  return {
    hasSelection,
    selectedCount,
    canDuplicate: hasSelection,
    canDelete: hasSelection,
    canGroup: canGroupLayers([...layers], [...selectedLayerIds]),
    canUngroup: selectedLayers.some((layer) => layer.type === "group"),
    canWrapInFrame: hasSelection && shareParent(selectedLayers),
    canFlatten: selectedLayers.some((layer) => layer.type === "group"),
    canBoolean: shapeOrPathCount >= 2,
    canOutlineText: textCount > 0,
    canOutlineStroke: shapeOrPathCount > 0,
    canMask: selectedLayers.some(
      (layer) =>
        Boolean(layer.parentId) &&
        (layer.type === "shape" || layer.type === "text"),
    ),
    canReorder: hasSelection,
    canToggleVisibility: hasSelection,
    canToggleLock: hasSelection,
    canCopyAsPng: hasSelection,
  };
}

/** True when every layer shares the same parent (the frame op requires it). */
function shareParent(layers: readonly LayerType[]): boolean {
  const first = layers[0];
  if (!first) return false;
  const parentId = first.parentId ?? null;
  return layers.every((layer) => (layer.parentId ?? null) === parentId);
}
