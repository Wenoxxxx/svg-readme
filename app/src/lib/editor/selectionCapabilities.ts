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
  canCopy: boolean;
  canCut: boolean;
  /** Clipboard holds layers — the target selection is irrelevant to Paste here. */
  canPasteHere: boolean;
  /** Clipboard layer count matches the selection, so a 1:1 replace is possible. */
  canPasteToReplace: boolean;
  canDuplicate: boolean;
  canDelete: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canWrapInFrame: boolean;
  /** Wrap the selection in a container and lay its children out along one axis. */
  canAddAutoLayout: boolean;
  canFlatten: boolean;
  /** ≥2 selected shape/path layers — enables real boolean ops. */
  canBoolean: boolean;
  /** The selection contains a text layer with element properties — enables Outline Text. */
  canOutlineText: boolean;
  /** The selection contains a shape/path layer with element properties — enables Outline Stroke. */
  canOutlineStroke: boolean;
  /** Turn the selection into a reusable component master. */
  canCreateComponent: boolean;
  /** A selected layer inside a group can act as a mask. */
  canMask: boolean;
  canReorder: boolean;
  canToggleVisibility: boolean;
  canToggleLock: boolean;
  /** At least one selected layer carries element properties that can be mirrored. */
  canFlip: boolean;
  canCopyAsPng: boolean;
}

export interface SelectionCapabilitiesInput {
  layers: readonly LayerType[];
  selectedLayerIds: readonly string[];
  elementProperties?: Readonly<Record<string, ElementProperties>>;
  /** Whether the editor clipboard currently holds layers (Paste here). */
  hasClipboard?: boolean;
  /** How many top-level layers the clipboard holds (Paste to replace). */
  clipboardCount?: number;
  /**
   * Whether the OS clipboard is readable. Paste here stays available on that
   * alone, because content copied outside this editor is still pasteable even
   * though the internal clipboard is empty.
   */
  clipboardReadable?: boolean;
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
  const {
    layers,
    selectedLayerIds,
    elementProperties = {},
    hasClipboard = false,
    clipboardCount,
    clipboardReadable = false,
  } = input;

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
    canCopy: hasSelection,
    canCut: hasSelection,
    canPasteHere: hasClipboard || clipboardReadable,
    // Figma parity: Paste to replace needs the same number of layers on both
    // sides, otherwise there is no unambiguous 1:1 target for each clipboard
    // layer.
    canPasteToReplace:
      hasClipboard && hasSelection && clipboardCount === selectedCount,
    canDuplicate: hasSelection,
    canDelete: hasSelection,
    canGroup: canGroupLayers([...layers], [...selectedLayerIds]),
    canUngroup: selectedLayers.some((layer) => layer.type === "group"),
    canWrapInFrame: hasSelection && shareParent(selectedLayers),
    canAddAutoLayout: hasSelection,
    canFlatten: selectedLayers.some((layer) => layer.type === "group"),
    canBoolean: shapeOrPathCount >= 2,
    canOutlineText: textCount > 0,
    canOutlineStroke: shapeOrPathCount > 0,
    // Already a component master → there is nothing left to create.
    canCreateComponent:
      hasSelection && !selectedLayers.some((layer) => layer.isComponent === true),
    // Any nested layer can clip its siblings, not just shapes and text.
    canMask: selectedLayers.some((layer) => Boolean(layer.parentId)),
    canReorder: hasSelection,
    canToggleVisibility: hasSelection,
    canToggleLock: hasSelection,
    canFlip: selectedProperties.some(Boolean),
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
