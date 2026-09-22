import { useCallback, useMemo, type MutableRefObject } from "react";
import type { LayerType } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";
import type { ReorderDirection } from "../../../lib/editor/documentActions";
import {
  reorderSelectedLayers,
  groupLayers,
  ungroupLayer,
  canGroupLayers,
  duplicateLayersWithChildren,
} from "../../../lib/editor/documentActions";
import {
  flattenGroup,
  wrapInFrame,
  toggleLayerMask,
  applyBooleanOp,
  outlineText,
  outlineStroke,
  smartDelete,
  addAutoLayout,
  createComponent,
  linkInstancesToMasters,
  flipLayers,
  type FlipAxis,
} from "../../../lib/editor/layerOps";
import { computeSelectionCapabilities } from "../../../lib/editor/selectionCapabilities";
import {
  buildLayerCommands,
  runLayerCommand,
  type LayerCommandHandlers,
  type LayerCommandId,
} from "../../../lib/editor/commands/layerCommands";

/**
 * The clipboard commands the menu exposes.
 *
 * Injected rather than reimplemented: the copy/paste machinery already lives
 * with the clipboard hook (internal + OS clipboard, PNG/SVG export), and the
 * registry dispatch must call exactly the same functions the keyboard
 * shortcuts do. `hasClipboard`/`clipboardCount` mirror the clipboard's state so
 * the capability layer can gate Paste here and Paste to replace.
 */
export interface LayerClipboardPort {
  hasClipboard: boolean;
  clipboardCount: number;
  /** Whether the OS clipboard is readable — keeps Paste here enabled. */
  clipboardReadable: boolean;
  copy: () => void;
  cut: () => void;
  pasteHere: () => void;
  pasteToReplace: () => void;
  copyAsPng: () => void;
  copyAsSvg: () => void;
}

/** Clipboard commands that are not wired yet fall back to a no-op. */
const NOOP_CLIPBOARD: LayerClipboardPort = {
  hasClipboard: false,
  clipboardCount: 0,
  clipboardReadable: false,
  copy: () => {},
  cut: () => {},
  pasteHere: () => {},
  pasteToReplace: () => {},
  copyAsPng: () => {},
  copyAsSvg: () => {},
};

export interface LayerOperationsParams {
  documentRef: MutableRefObject<{
    layers: LayerType[];
    elementProperties: Record<string, ElementProperties>;
    selectedLayerIds: string[];
    frameSize: { width: number; height: number };
  }>;
  saveToHistory: () => void;
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  setElementProperties: React.Dispatch<React.SetStateAction<Record<string, ElementProperties>>>;
  setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedLayerId: (id: string | null) => void;
  /** Copy/cut/paste + copy-as bindings shared with the keyboard shortcuts. */
  clipboard?: LayerClipboardPort;
}

export function useLayerOperations(params: LayerOperationsParams) {
  const {
    documentRef,
    saveToHistory,
    setLayers,
    setElementProperties,
    setSelectedLayerIds,
    setSelectedLayerId,
    clipboard = NOOP_CLIPBOARD,
  } = params;

  // ── Duplicate ──────────────────────────────────────────────────────────
  const handleDuplicate = useCallback(() => {
    const { layers: currentLayers, elementProperties: currentProperties, selectedLayerIds: currentSelection } = documentRef.current;

    const result = duplicateLayersWithChildren(
      currentLayers,
      currentProperties,
      currentSelection,
    );
    if (!result) return;
    const { duplicatedProperties, duplicatedTopIds } = result;
    // Duplicating a component master yields an *instance* that stays linked to
    // it, rather than a second independent master.
    const duplicatedLayers = linkInstancesToMasters(
      result.duplicatedLayers,
      currentLayers,
    );

    saveToHistory();
    setLayers((previous) => [
      ...previous.map((layer) => ({ ...layer, active: false })),
      ...duplicatedLayers,
    ]);
    setElementProperties((previous) => ({ ...previous, ...duplicatedProperties }));
    setSelectedLayerIds(duplicatedTopIds);
    setSelectedLayerId(duplicatedTopIds[0] ?? null);
  }, [documentRef, saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId]);

  // ── Reorder layers ────────────────────────────────────────────────────
  const handleReorderLayers = useCallback((direction: ReorderDirection) => {
    const currentSelection = documentRef.current.selectedLayerIds;
    if (currentSelection.length === 0) return;

    saveToHistory();
    setLayers((previous) => reorderSelectedLayers(previous, currentSelection, direction));
  }, [documentRef, saveToHistory, setLayers]);

  // ── Group ─────────────────────────────────────────────────────────────
  const handleGroup = useCallback(() => {
    const currentSelection = documentRef.current.selectedLayerIds;
    const currentLayers = documentRef.current.layers;
    if (!canGroupLayers(currentLayers, currentSelection)) return;

    saveToHistory();
    setLayers((previous) => {
      const result = groupLayers(previous, currentSelection);
      if (!result) return previous;
      return result.updatedLayers;
    });
  }, [documentRef, saveToHistory, setLayers]);

  // ── Ungroup ───────────────────────────────────────────────────────────
  const handleUngroup = useCallback(() => {
    const currentSelection = documentRef.current.selectedLayerIds;
    const currentLayers = documentRef.current.layers;

    const groupId = currentSelection.find((id) => {
      const layer = currentLayers.find((l) => l.id === id);
      return layer?.type === "group";
    });
    if (!groupId) return;

    saveToHistory();
    setLayers((previous) => {
      const result = ungroupLayer(previous, groupId);
      if (!result) return previous;
      setSelectedLayerIds(result.childIds);
      setSelectedLayerId(result.childIds[0] ?? null);
      return result.updatedLayers;
    });
  }, [documentRef, saveToHistory, setLayers, setSelectedLayerIds, setSelectedLayerId]);

  // ── Flatten group ─────────────────────────────────────────────────────
  const handleFlatten = useCallback(() => {
    const currentSelection = documentRef.current.selectedLayerIds;
    const currentLayers = documentRef.current.layers;
    const currentProperties = documentRef.current.elementProperties;
    const groupId = currentSelection.find((id) => {
      const layer = currentLayers.find((l) => l.id === id);
      return layer?.type === "group";
    });
    if (!groupId) return;

    saveToHistory();
    setLayers((previous) => {
      const result = flattenGroup(previous, currentProperties, groupId);
      if (!result) return previous;
      setElementProperties(result.updatedProperties);
      setSelectedLayerIds([]);
      setSelectedLayerId(null);
      return result.updatedLayers;
    });
  }, [documentRef, saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId]);

  // ── Wrap in frame ─────────────────────────────────────────────────────
  const handleWrapInFrame = useCallback(() => {
    const currentSelection = documentRef.current.selectedLayerIds;
    if (currentSelection.length === 0) return;

    saveToHistory();
    setLayers((previous) => {
      const result = wrapInFrame(previous, currentSelection);
      if (!result) return previous;
      setSelectedLayerIds([result.groupId]);
      setSelectedLayerId(result.groupId);
      return result.updatedLayers;
    });
  }, [documentRef, saveToHistory, setLayers, setSelectedLayerIds, setSelectedLayerId]);

  // ── Toggle mask ───────────────────────────────────────────────────────
  const handleToggleMask = useCallback(() => {
    const currentSelection = documentRef.current.selectedLayerIds;
    if (currentSelection.length === 0) return;
    const targetId = currentSelection[0];
    const currentProperties = documentRef.current.elementProperties;

    saveToHistory();
    setLayers((previous) => {
      const result = toggleLayerMask(previous, currentProperties, targetId);
      if (!result) return previous;
      setElementProperties(result.updatedProperties);
      return result.updatedLayers;
    });
  }, [documentRef, saveToHistory, setLayers, setElementProperties]);

  // ── Boolean operations ────────────────────────────────────────────────
  const handleBooleanOp = useCallback(
    (op: "union" | "subtract" | "intersect" | "exclude") => {
      const currentSelection = documentRef.current.selectedLayerIds;
      const currentLayers = documentRef.current.layers;
      const currentProperties = documentRef.current.elementProperties;
      if (currentSelection.length < 2) return;

      saveToHistory();
      const result = applyBooleanOp(currentLayers, currentProperties, currentSelection, op);
      if (!result) return;
      setLayers(result.updatedLayers);
      setElementProperties(result.updatedProperties);
      setSelectedLayerIds([result.resultId]);
      setSelectedLayerId(result.resultId);
    },
    [documentRef, saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId],
  );

  // ── Outline text ──────────────────────────────────────────────────────
  const handleOutlineText = useCallback(() => {
    const currentSelection = documentRef.current.selectedLayerIds;
    const currentLayers = documentRef.current.layers;
    const currentProperties = documentRef.current.elementProperties;
    const textId = currentSelection.find((id) => {
      const props = currentProperties[id];
      return props?.type === "text";
    });
    if (!textId) return;

    saveToHistory();
    const result = outlineText(currentLayers, currentProperties, textId);
    if (!result) return;
    setLayers(result.updatedLayers);
    setElementProperties(result.updatedProperties);
    setSelectedLayerIds([result.pathId]);
    setSelectedLayerId(result.pathId);
  }, [documentRef, saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId]);

  // ── Outline stroke ────────────────────────────────────────────────────
  const handleOutlineStroke = useCallback(() => {
    const currentSelection = documentRef.current.selectedLayerIds;
    const currentLayers = documentRef.current.layers;
    const currentProperties = documentRef.current.elementProperties;
    const shapeId = currentSelection.find((id) => {
      const props = currentProperties[id];
      return props?.type === "shape" || props?.type === "path";
    });
    if (!shapeId) return;

    saveToHistory();
    const result = outlineStroke(currentLayers, currentProperties, shapeId);
    if (!result) return;
    setLayers(result.updatedLayers);
    setElementProperties(result.updatedProperties);
    setSelectedLayerIds([result.pathId]);
    setSelectedLayerId(result.pathId);
  }, [documentRef, saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId]);

  // ── Smart delete (Alt+Delete) ─────────────────────────────────────────
  const handleSmartDelete = useCallback(
    (preserveChildren: boolean) => {
      const currentSelection = documentRef.current.selectedLayerIds;
      const currentLayers = documentRef.current.layers;
      const currentProperties = documentRef.current.elementProperties;
      if (currentSelection.length === 0) return;

      const hasLocked = currentSelection.some((id) => {
        const layer = currentLayers.find((l) => l.id === id);
        return layer?.locked;
      });
      if (hasLocked) return;

      saveToHistory();
      const result = smartDelete(currentLayers, currentProperties, currentSelection, preserveChildren);
      if (!result) return;
      setLayers(result.updatedLayers);
      setElementProperties(result.updatedProperties);
      setSelectedLayerIds([]);
      setSelectedLayerId(null);
    },
    [documentRef, saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId],
  );

  // ── Toggle visibility ─────────────────────────────────────────────────
  // Acts on the whole selection (the menu can be opened over a multi-selection)
  // and follows the reference's single combined row: if anything in the
  // selection is hidden, the command reveals it all; otherwise it hides it all.
  const handleToggleLayerVisibility = useCallback(() => {
    const selection = documentRef.current.selectedLayerIds;
    if (selection.length === 0) return;
    const byId = new Map(documentRef.current.layers.map((l) => [l.id, l]));
    const anyHidden = selection.some((id) => byId.get(id)?.visible === false);
    const visible = anyHidden;

    saveToHistory();
    setLayers((prev) =>
      prev.map((l) => (selection.includes(l.id) ? { ...l, visible } : l)),
    );
  }, [documentRef, saveToHistory, setLayers]);

  // ── Toggle lock ───────────────────────────────────────────────────────
  const handleToggleLayerLock = useCallback(() => {
    const selection = documentRef.current.selectedLayerIds;
    if (selection.length === 0) return;
    const byId = new Map(documentRef.current.layers.map((l) => [l.id, l]));
    const anyUnlocked = selection.some((id) => byId.get(id)?.locked === false);
    const locked = anyUnlocked;

    saveToHistory();
    setLayers((prev) =>
      prev.map((l) => (selection.includes(l.id) ? { ...l, locked } : l)),
    );
  }, [documentRef, saveToHistory, setLayers]);

  // ── Add auto layout ───────────────────────────────────────────────────
  // Wraps the selection in a container that owns its children's positions, and
  // writes the first pass of those positions immediately so the canvas updates
  // without a second render pass.
  const handleAddAutoLayout = useCallback(() => {
    const { layers: currentLayers, elementProperties: currentProperties, selectedLayerIds: currentSelection } = documentRef.current;
    if (currentSelection.length === 0) return;

    const result = addAutoLayout(currentLayers, currentProperties, currentSelection);
    if (!result) return;

    saveToHistory();
    setLayers(result.updatedLayers);
    setElementProperties(result.updatedProperties);
    setSelectedLayerIds([result.containerId]);
    setSelectedLayerId(result.containerId);
  }, [documentRef, saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId]);

  // ── Create component ──────────────────────────────────────────────────
  const handleCreateComponent = useCallback(() => {
    const { layers: currentLayers, selectedLayerIds: currentSelection } = documentRef.current;
    if (currentSelection.length === 0) return;

    const result = createComponent(currentLayers, currentSelection);
    if (!result) return;

    saveToHistory();
    setLayers(result.updatedLayers);
    setSelectedLayerIds([result.masterId]);
    setSelectedLayerId(result.masterId);
  }, [documentRef, saveToHistory, setLayers, setSelectedLayerIds, setSelectedLayerId]);

  // ── Flip ──────────────────────────────────────────────────────────────
  // Toggles the flipH/flipV flags the renderer and exporter already honour, so
  // the result matches the right bar's flip buttons exactly.
  const handleFlip = useCallback(
    (axis: FlipAxis) => {
      const { elementProperties: currentProperties, selectedLayerIds: currentSelection } = documentRef.current;
      if (currentSelection.length === 0) return;

      const result = flipLayers(currentProperties, currentSelection, axis);
      if (!result) return;

      saveToHistory();
      setElementProperties((prev) => ({ ...prev, ...result.updatedProperties }));
    },
    [documentRef, saveToHistory, setElementProperties],
  );

  // ── Layer context menu action handler ─────────────────────────────────
  // The action map is memoized (not a ref written during render) so the
  // context menu can look up handlers by action id without a render-time
  // ref mutation. All handlers are stable useCallbacks, so this is cheap.
  const layerActionMap = useMemo<LayerCommandHandlers>(
    () => ({
      // Clipboard — the same functions the keyboard shortcuts call.
      copy: clipboard.copy,
      cut: clipboard.cut,
      pasteHere: clipboard.pasteHere,
      pasteToReplace: clipboard.pasteToReplace,
      copyAsPng: clipboard.copyAsPng,
      copyAsSvg: clipboard.copyAsSvg,
      // Edit
      duplicate: handleDuplicate,
      bringToFront: () => handleReorderLayers("front"),
      bringForward: () => handleReorderLayers("forward"),
      sendBackward: () => handleReorderLayers("backward"),
      sendToBack: () => handleReorderLayers("back"),
      // Structure
      group: handleGroup,
      ungroup: handleUngroup,
      wrapInFrame: handleWrapInFrame,
      addAutoLayout: handleAddAutoLayout,
      toggleMask: handleToggleMask,
      flatten: handleFlatten,
      outlineText: handleOutlineText,
      outlineStroke: handleOutlineStroke,
      // Component
      createComponent: handleCreateComponent,
      // State
      toggleVisibility: handleToggleLayerVisibility,
      toggleLock: handleToggleLayerLock,
      // Transform
      flipHorizontal: () => handleFlip("horizontal"),
      flipVertical: () => handleFlip("vertical"),
      // Not part of the reference menu, still dispatchable.
      booleanUnion: () => handleBooleanOp("union"),
      booleanSubtract: () => handleBooleanOp("subtract"),
      booleanIntersect: () => handleBooleanOp("intersect"),
      booleanExclude: () => handleBooleanOp("exclude"),
    }),
    [
      clipboard,
      handleDuplicate,
      handleReorderLayers,
      handleGroup,
      handleUngroup,
      handleWrapInFrame,
      handleAddAutoLayout,
      handleToggleLayerVisibility,
      handleToggleLayerLock,
      handleCreateComponent,
      handleFlip,
      handleFlatten,
      handleOutlineText,
      handleOutlineStroke,
      handleToggleMask,
      handleBooleanOp,
    ],
  );

  // Dispatch through the capability-gated command registry: the enabled/disabled
  // decision lives in `selectionCapabilities`, so the menu, shortcuts and this
  // dispatcher can never disagree about what a selection allows.
  const handleLayerContextAction = useCallback(
    (actionId: string) => {
      const { layers, selectedLayerIds, elementProperties } = documentRef.current;
      const capabilities = computeSelectionCapabilities({
        layers,
        selectedLayerIds,
        elementProperties,
        hasClipboard: clipboard.hasClipboard,
        clipboardCount: clipboard.clipboardCount,
        clipboardReadable: clipboard.clipboardReadable,
      });
      const commands = buildLayerCommands({
        capabilities,
        handlers: layerActionMap,
      });
      runLayerCommand(commands, actionId as LayerCommandId);
    },
    [documentRef, layerActionMap, clipboard],
  );

  return {
    handleDuplicate,
    handleReorderLayers,
    handleGroup,
    handleUngroup,
    handleFlatten,
    handleWrapInFrame,
    handleToggleMask,
    handleBooleanOp,
    handleAddAutoLayout,
    handleCreateComponent,
    handleFlip,
    handleOutlineText,
    handleOutlineStroke,
    handleSmartDelete,
    handleToggleLayerVisibility,
    handleToggleLayerLock,
    handleLayerContextAction,
    /** Handler map for callers that build their own command registry. */
    layerCommandHandlers: layerActionMap,
  };
}
