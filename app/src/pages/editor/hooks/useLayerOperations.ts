import { useCallback, useMemo, useRef, type MutableRefObject } from "react";
import type { LayerType } from "../../../context/EditorContext";
import type {
  ElementProperties,
  ShapeElementProperties,
} from "../../../components/editor-canvas/ElementsRenderer";
import type { ReorderDirection } from "../../../lib/editor/documentActions";
import {
  reorderSelectedLayers,
  groupLayers,
  ungroupLayer,
  canGroupLayers,
  duplicateLayersWithChildren,
} from "../../../lib/editor/documentActions";
import {
  flattenLayers,
  wrapInFrame,
  toggleLayerMask,
  applyBooleanOp,
  outlineText,
  outlineStroke,
  smartDelete,
  addAutoLayout,
  createComponent,
  detachInstances,
  findMatchingLayerIds,
  linkInstancesToMasters,
  flipLayers,
  type FlipAxis,
} from "../../../lib/editor/layerOps";
import {
  computeSelectionCapabilities,
  resolveCommandTargetId,
} from "../../../lib/editor/selectionCapabilities";
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
 * with the clipboard hook (internal + OS clipboard), the selection export with
 * the export hook, and the registry dispatch must call exactly the same
 * functions the keyboard shortcuts do. `hasClipboard`/`clipboardCount` mirror
 * the clipboard's state so the capability layer can gate Paste here and Paste
 * to replace.
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
  /** Copy the *selection* (not the whole banner) as PNG / SVG / CSS. */
  copyAsPng: () => void;
  copyAsSvg: () => void;
  copyAsCss?: () => void;
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
  /** Selection setter; the editor's version also syncs `layer.active`. */
  setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedLayerId: (id: string | null) => void;
  /** Copy/cut/paste + copy-as bindings shared with the keyboard shortcuts. */
  clipboard?: LayerClipboardPort;
}

/** Ids are generated once per operation, outside any state updater. */
function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Where a new layer goes: directly in front of the frontmost selected layer
 * (same parent), or at the top of the root level when nothing is selected.
 */
function insertionPoint(
  layers: readonly LayerType[],
  selectedLayerIds: readonly string[],
): { index: number; parentId: string | null } {
  const selected = new Set(selectedLayerIds);
  let anchorIndex = -1;
  layers.forEach((layer, index) => {
    if (selected.has(layer.id)) anchorIndex = index;
  });
  if (anchorIndex < 0) return { index: layers.length, parentId: null };
  return { index: anchorIndex + 1, parentId: layers[anchorIndex].parentId ?? null };
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

  /** Replace the selection (ids + primary id); `layer.active` follows. */
  const select = useCallback(
    (ids: string[]) => {
      setSelectedLayerIds(ids);
      setSelectedLayerId(ids[0] ?? null);
    },
    [setSelectedLayerIds, setSelectedLayerId],
  );

  /** Commit a computed document: one history step, then the new state. */
  const commit = useCallback(
    (
      layers: LayerType[],
      properties?: Record<string, ElementProperties>,
      selection?: string[],
    ) => {
      saveToHistory();
      if (selection) {
        // Bake the active flags in so the panel highlight is right on the
        // very first render after the operation.
        const active = new Set(selection);
        setLayers(
          layers.map((layer) =>
            (layer.active === true) === active.has(layer.id)
              ? layer
              : { ...layer, active: active.has(layer.id) },
          ),
        );
      } else {
        setLayers(layers);
      }
      if (properties) setElementProperties(properties);
      if (selection) select(selection);
    },
    [saveToHistory, setLayers, setElementProperties, select],
  );

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

    commit(
      [...currentLayers, ...duplicatedLayers],
      { ...currentProperties, ...duplicatedProperties },
      duplicatedTopIds,
    );
  }, [documentRef, commit]);

  // ── Add layer / add group (layer panel header) ────────────────────────
  // "Add Layer" creates a real, visible default rectangle (layer + element
  // properties) in front of the selection and selects it.
  const handleAddLayer = useCallback(() => {
    const { layers, elementProperties, selectedLayerIds, frameSize } = documentRef.current;
    const { index, parentId } = insertionPoint(layers, selectedLayerIds);
    const id = newId("rect");
    const width = Math.max(20, Math.round(Math.min(160, frameSize.width / 4)));
    const height = Math.max(20, Math.round(Math.min(100, frameSize.height / 2)));
    const layer: LayerType = {
      id,
      name: "Rectangle",
      type: "shape",
      locked: false,
      visible: true,
      active: true,
      parentId,
    };
    const props: ShapeElementProperties = {
      type: "shape",
      kind: "rect",
      x: Math.round((frameSize.width - width) / 2),
      y: Math.round((frameSize.height - height) / 2),
      width,
      height,
      fill: "#8b5cf6",
      stroke: "rgba(255,255,255,0.2)",
      strokeWidth: 1,
      cornerRadius: 8,
      opacity: 1,
    };
    const next = [...layers];
    next.splice(index, 0, layer);
    commit(next, { ...elementProperties, [id]: props }, [id]);
  }, [documentRef, commit]);

  const handleAddGroup = useCallback(() => {
    const { layers, selectedLayerIds } = documentRef.current;
    const { index, parentId } = insertionPoint(layers, selectedLayerIds);
    const id = newId("group");
    const group: LayerType = {
      id,
      name: "Group",
      type: "group",
      locked: false,
      visible: true,
      active: true,
      parentId,
      collapsed: false,
    };
    const next = [...layers];
    next.splice(index, 0, group);
    commit(next, undefined, [id]);
  }, [documentRef, commit]);

  // ── Reorder layers ────────────────────────────────────────────────────
  // Sibling-scoped: a layer only moves among its own siblings, and its
  // descendants (linked by parentId) travel with it.
  const handleReorderLayers = useCallback((direction: ReorderDirection) => {
    const { layers, selectedLayerIds } = documentRef.current;
    if (selectedLayerIds.length === 0) return;
    const next = reorderSelectedLayers(layers, selectedLayerIds, direction);
    if (next === layers) return;
    commit(next);
  }, [documentRef, commit]);

  // ── Group ─────────────────────────────────────────────────────────────
  const handleGroup = useCallback(() => {
    const { layers, selectedLayerIds } = documentRef.current;
    if (!canGroupLayers(layers, selectedLayerIds)) return;
    const result = groupLayers(layers, selectedLayerIds);
    if (!result) return;
    commit(result.updatedLayers, undefined, [result.groupLayer.id]);
  }, [documentRef, commit]);

  // ── Ungroup ───────────────────────────────────────────────────────────
  const handleUngroup = useCallback(() => {
    const { layers, selectedLayerIds } = documentRef.current;
    const groupId = selectedLayerIds.find(
      (id) => layers.find((l) => l.id === id)?.type === "group",
    );
    if (!groupId) return;
    const result = ungroupLayer(layers, groupId);
    if (!result) return;
    commit(result.updatedLayers, undefined, result.childIds);
  }, [documentRef, commit]);

  // ── Flatten (merge outlines into ONE path layer) ──────────────────────
  const handleFlatten = useCallback(() => {
    const { layers, elementProperties, selectedLayerIds } = documentRef.current;
    if (selectedLayerIds.length === 0) return;
    const result = flattenLayers(layers, elementProperties, selectedLayerIds);
    if (!result) return;
    commit(result.updatedLayers, result.updatedProperties, [result.pathId]);
  }, [documentRef, commit]);

  // ── Wrap in frame ─────────────────────────────────────────────────────
  const handleWrapInFrame = useCallback(() => {
    const { layers, selectedLayerIds } = documentRef.current;
    if (selectedLayerIds.length === 0) return;
    const result = wrapInFrame(layers, selectedLayerIds);
    if (!result) return;
    commit(result.updatedLayers, undefined, [result.groupId]);
  }, [documentRef, commit]);

  // ── Toggle mask ───────────────────────────────────────────────────────
  // Acts on the same layer the menu label describes (`resolveCommandTargetId`:
  // the right-clicked layer when it is selected, else the first selected).
  const handleToggleMask = useCallback((anchorLayerId?: string | null) => {
    const { layers, elementProperties, selectedLayerIds } = documentRef.current;
    const targetId = resolveCommandTargetId(layers, selectedLayerIds, anchorLayerId);
    if (!targetId) return;
    const result = toggleLayerMask(layers, elementProperties, targetId);
    if (!result) return;
    commit(result.updatedLayers, result.updatedProperties);
  }, [documentRef, commit]);

  // ── Boolean operations ────────────────────────────────────────────────
  const handleBooleanOp = useCallback(
    (op: "union" | "subtract" | "intersect" | "exclude") => {
      const { layers, elementProperties, selectedLayerIds } = documentRef.current;
      if (selectedLayerIds.length < 2) return;
      const result = applyBooleanOp(layers, elementProperties, selectedLayerIds, op);
      if (!result) return;
      commit(result.updatedLayers, result.updatedProperties, [result.resultId]);
    },
    [documentRef, commit],
  );

  // ── Outline text ──────────────────────────────────────────────────────
  const handleOutlineText = useCallback(() => {
    const { layers, elementProperties, selectedLayerIds } = documentRef.current;
    const textId = selectedLayerIds.find((id) => elementProperties[id]?.type === "text");
    if (!textId) return;
    const result = outlineText(layers, elementProperties, textId);
    if (!result) return;
    commit(result.updatedLayers, result.updatedProperties, [result.pathId]);
  }, [documentRef, commit]);

  // ── Outline stroke ────────────────────────────────────────────────────
  const handleOutlineStroke = useCallback(() => {
    const { layers, elementProperties, selectedLayerIds } = documentRef.current;
    const shapeId = selectedLayerIds.find((id) => {
      const type = elementProperties[id]?.type;
      return type === "shape" || type === "path";
    });
    if (!shapeId) return;
    const result = outlineStroke(layers, elementProperties, shapeId);
    if (!result) return;
    commit(result.updatedLayers, result.updatedProperties, [result.pathId]);
  }, [documentRef, commit]);

  // ── Smart delete (Alt+Delete) ─────────────────────────────────────────
  const handleSmartDelete = useCallback(
    (preserveChildren: boolean) => {
      const { layers, elementProperties, selectedLayerIds } = documentRef.current;
      // Same lock rule as Delete: locked layers are skipped, not blocking.
      const byId = new Map(layers.map((l) => [l.id, l]));
      const targets = selectedLayerIds.filter((id) => byId.get(id)?.locked !== true);
      if (targets.length === 0) return;
      const result = smartDelete(layers, elementProperties, targets, preserveChildren);
      if (!result) return;
      const remaining = new Set(result.updatedLayers.map((l) => l.id));
      commit(
        result.updatedLayers,
        result.updatedProperties,
        selectedLayerIds.filter((id) => remaining.has(id) && !targets.includes(id)),
      );
    },
    [documentRef, commit],
  );

  // ── Toggle visibility ─────────────────────────────────────────────────
  // Acts on the whole selection (the menu can be opened over a multi-selection)
  // and follows the reference's single combined row: if anything in the
  // selection is hidden, the command reveals it all; otherwise it hides it all.
  const handleToggleLayerVisibility = useCallback(() => {
    const { layers, selectedLayerIds: selection } = documentRef.current;
    if (selection.length === 0) return;
    const byId = new Map(layers.map((l) => [l.id, l]));
    const visible = selection.some((id) => byId.get(id)?.visible === false);
    commit(layers.map((l) => (selection.includes(l.id) ? { ...l, visible } : l)));
  }, [documentRef, commit]);

  // ── Toggle lock ───────────────────────────────────────────────────────
  const handleToggleLayerLock = useCallback(() => {
    const { layers, selectedLayerIds: selection } = documentRef.current;
    if (selection.length === 0) return;
    const byId = new Map(layers.map((l) => [l.id, l]));
    const locked = selection.some((id) => byId.get(id)?.locked === false);
    commit(layers.map((l) => (selection.includes(l.id) ? { ...l, locked } : l)));
  }, [documentRef, commit]);

  // ── Add auto layout ───────────────────────────────────────────────────
  // Wraps the selection in a container that owns its children's positions, and
  // writes the first pass of those positions immediately so the canvas updates
  // without a second render pass.
  const handleAddAutoLayout = useCallback(() => {
    const { layers, elementProperties, selectedLayerIds } = documentRef.current;
    if (selectedLayerIds.length === 0) return;
    const result = addAutoLayout(layers, elementProperties, selectedLayerIds);
    if (!result) return;
    commit(result.updatedLayers, result.updatedProperties, [result.containerId]);
  }, [documentRef, commit]);

  // ── Create component ──────────────────────────────────────────────────
  const handleCreateComponent = useCallback(() => {
    const { layers, selectedLayerIds } = documentRef.current;
    if (selectedLayerIds.length === 0) return;
    const result = createComponent(layers, selectedLayerIds);
    if (!result) return;
    commit(result.updatedLayers, undefined, [result.masterId]);
  }, [documentRef, commit]);

  // ── Detach instance ───────────────────────────────────────────────────
  const handleDetachInstance = useCallback(() => {
    const { layers, selectedLayerIds } = documentRef.current;
    const updated = detachInstances(layers, selectedLayerIds);
    if (!updated) return;
    commit(updated);
  }, [documentRef, commit]);

  // ── Select matching layers ────────────────────────────────────────────
  // A selection change, not a document edit: no history entry.
  const handleSelectMatching = useCallback(() => {
    const { layers, elementProperties, selectedLayerIds } = documentRef.current;
    const ids = findMatchingLayerIds(layers, elementProperties, selectedLayerIds);
    if (ids.length === 0) return;
    select(ids);
  }, [documentRef, select]);

  // ── Flip ──────────────────────────────────────────────────────────────
  // Toggles the flipH/flipV flags the renderer and exporter already honour, so
  // the result matches the right bar's flip buttons exactly.
  const handleFlip = useCallback(
    (axis: FlipAxis) => {
      const { elementProperties, selectedLayerIds } = documentRef.current;
      if (selectedLayerIds.length === 0) return;
      const result = flipLayers(elementProperties, selectedLayerIds, axis);
      if (!result) return;
      saveToHistory();
      setElementProperties({ ...elementProperties, ...result.updatedProperties });
    },
    [documentRef, saveToHistory, setElementProperties],
  );

  // The layer a menu was opened on. Set for the duration of one dispatch so
  // commands that target a single layer (Use as mask) act on the layer the
  // menu label was resolved from.
  const anchorRef = useRef<string | null>(null);

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
      ...(clipboard.copyAsCss ? { copyAsCss: clipboard.copyAsCss } : {}),
      // Edit
      duplicate: handleDuplicate,
      // `delete` is owned by the editor shell (shared with Cut/Backspace/row
      // trash via `deleteLayers`), which intercepts it before this map.
      selectMatching: handleSelectMatching,
      bringToFront: () => handleReorderLayers("front"),
      bringForward: () => handleReorderLayers("forward"),
      sendBackward: () => handleReorderLayers("backward"),
      sendToBack: () => handleReorderLayers("back"),
      // Structure
      group: handleGroup,
      ungroup: handleUngroup,
      wrapInFrame: handleWrapInFrame,
      addAutoLayout: handleAddAutoLayout,
      toggleMask: () => handleToggleMask(anchorRef.current),
      flatten: handleFlatten,
      outlineText: handleOutlineText,
      outlineStroke: handleOutlineStroke,
      booleanUnion: () => handleBooleanOp("union"),
      booleanSubtract: () => handleBooleanOp("subtract"),
      booleanIntersect: () => handleBooleanOp("intersect"),
      booleanExclude: () => handleBooleanOp("exclude"),
      // Component
      createComponent: handleCreateComponent,
      detachInstance: handleDetachInstance,
      // State
      toggleVisibility: handleToggleLayerVisibility,
      toggleLock: handleToggleLayerLock,
      // Transform
      flipHorizontal: () => handleFlip("horizontal"),
      flipVertical: () => handleFlip("vertical"),
    }),
    [
      clipboard,
      handleDuplicate,
      handleSelectMatching,
      handleReorderLayers,
      handleGroup,
      handleUngroup,
      handleWrapInFrame,
      handleAddAutoLayout,
      handleToggleLayerVisibility,
      handleToggleLayerLock,
      handleCreateComponent,
      handleDetachInstance,
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
    (actionId: string, anchorLayerId?: string | null) => {
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
      anchorRef.current = anchorLayerId ?? null;
      try {
        runLayerCommand(commands, actionId as LayerCommandId);
      } finally {
        anchorRef.current = null;
      }
    },
    [documentRef, layerActionMap, clipboard],
  );

  return {
    handleDuplicate,
    handleAddLayer,
    handleAddGroup,
    handleReorderLayers,
    handleGroup,
    handleUngroup,
    handleFlatten,
    handleWrapInFrame,
    handleToggleMask,
    handleBooleanOp,
    handleAddAutoLayout,
    handleCreateComponent,
    handleDetachInstance,
    handleSelectMatching,
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
