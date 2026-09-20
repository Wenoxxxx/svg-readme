import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_KEY = "svg-readme-editor";

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${LS_KEY}:${key}`);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${LS_KEY}:${key}`, JSON.stringify(value));
  } catch {
    /* quota exceeded – silently ignore */
  }
}

export function clearEditorStorage(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(`${LS_KEY}:`),
    );
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type LayerType = {
  id: string;
  name: string;
  type: "text" | "shape" | "image" | "group";
  locked: boolean;
  visible: boolean;
  active?: boolean;
  /** parentId links this layer to a group. null = root level, string = child of group with that id */
  parentId?: string | null;
  /** Only for groups: whether the group is collapsed in the layer panel */
  collapsed?: boolean;
  /** Whether this layer acts as a mask for its group children */
  masked?: boolean;
};

/**
 * Selection intent for `selectLayer`.
 *
 * `boolean` is the legacy Shift flag (`true` = additive toggle). The object form
 * spells the intent out so callers can forward a full `LayerSelectionMode`.
 * `range` is informational here: resolving a range needs the visible row order
 * and the selection anchor, which only the layer panel has — it computes the
 * slice with `layerSelectionForTarget` and applies it via `setSelection`.
 */
export type LayerSelectMode = boolean | { additive?: boolean; range?: boolean };

export type ShapeSubTool = "rect" | "circle" | "triangle" | "star" | "hexagon" | "line";

export type EditorTool =
  | "move"
  | "hand"
  | "text"
  | "frame"
  | "pen"
  | "shape"
  | "image"
  | "paint";

// Import inline to avoid circular dependency
type ElementProperties = import("../components/editor-canvas/ElementsRenderer").ElementProperties;

/** Canvas (frame) dimensions in SVG user units. */
export type FrameSize = { width: number; height: number };

export interface EditorState {
  activeTool: EditorTool;
  /** Which shape sub-tool is active when `activeTool === "shape"`. */
  selectedShapeKind: ShapeSubTool;
  /** Color selected for the paint bucket tool (hex like "#ff0000"). */
  paintColor: string;
  isEditingText: boolean;
  /** @deprecated Use selectedLayerIds instead for multi-select support */
  selectedLayerId: string | null;
  /** Multi-selection support — array of selected layer IDs. */
  selectedLayerIds: string[];
  layers: LayerType[];
  /** Element properties map (layerId → properties) — unified localStorage. */
  elementProperties: Record<string, ElementProperties>;
  frameSize: FrameSize;
  isProjectActive: boolean;
  /** When true, the canvas previews CSS animations on elements that have an animation config. */
  previewAnimation: boolean;
  /** When > 0, the canvas is in scrub mode and animations are paused at this time position. */
  scrubTime: number | null;
  /** Whether the document has unsaved changes (dirty state for navbar indicator). */
  isDirty: boolean;
  /** The backend project ID, if this project has been saved/loaded from backend. */
  currentProjectId: string | null;
  /** Editable project name shown in the navbar. */
  projectName: string;
}

export interface EditorActions {
  setActiveTool: (tool: EditorTool) => void;
  setSelectedShapeKind: (kind: ShapeSubTool) => void;
  /** Set the paint bucket color. */
  setPaintColor: (color: string) => void;
  setIsEditingText: (editing: boolean) => void;
  /** @deprecated Use selectLayer(id, mode), setSelection(ids) or clearSelection() instead */
  setSelectedLayerId: (id: string | null) => void;
  /** Direct setter for selectedLayerIds. */
  setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
  /**
   * Multi-select aware selection:
   * - `true` / `{ additive: true }` toggles the layer in/out of the selection
   * - `false` (or omitted) / `{ additive: false }` replaces the selection
   */
  selectLayer: (id: string, mode?: LayerSelectMode) => void;
  /**
   * Replaces the whole selection at once, keeping `selectedLayerId` and the
   * per-layer `active` flags in sync. Used by the layer panel after resolving a
   * range/ctrl selection against the visible rows.
   */
  setSelection: (ids: readonly string[]) => void;
  /** Clears all selected layers. */
  clearSelection: () => void;
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  /** Element properties setter (persists to localStorage). */
  setElementProperties: React.Dispatch<React.SetStateAction<Record<string, ElementProperties>>>;
  setFrameSize: (size: FrameSize) => void;
  setIsProjectActive: (active: boolean) => void;
  setPreviewAnimation: (preview: boolean) => void;
  setScrubTime: (time: number | null) => void;
  /** Mark the document as clean (called after a successful save). */
  markClean: () => void;
  /** Set the backend project ID. */
  setCurrentProjectId: (id: string | null) => void;
  /** Set the project name. */
  setProjectName: (name: string) => void;
}

export type EditorContextValue = EditorState & EditorActions;

// ─── Context ──────────────────────────────────────────────────────────────────

const EditorContext = createContext<EditorContextValue | null>(null);

// ─── Provider Props ──────────────────────────────────────────────────────────

interface EditorProviderProps {
  children: ReactNode;
  initial?: Partial<EditorState>;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EditorProvider({ children, initial }: EditorProviderProps) {
  const [activeTool, setActiveTool] = useState<EditorTool>(
    initial?.activeTool ?? "move",
  );
  const [selectedShapeKind, setSelectedShapeKind] = useState<ShapeSubTool>(
    initial?.selectedShapeKind ?? readStorage<ShapeSubTool>("selectedShapeKind", "rect"),
  );
  const [paintColor, setPaintColor] = useState<string>(
    readStorage("paintColor", "#3b82f6"),
  );
  const [isEditingText, setIsEditingText] = useState(
    initial?.isEditingText ?? false,
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    initial?.selectedLayerId ?? null,
  );
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(
    initial?.selectedLayerIds ?? [],
  );
  const [layers, setLayers] = useState<LayerType[]>(
    initial?.layers ?? readStorage<LayerType[]>("layers", []),
  );
  const [elementProperties, setElementProperties] = useState<
    Record<string, ElementProperties>
  >(
    initial?.elementProperties ??
    readStorage<Record<string, ElementProperties>>("elementProperties", {}),
  );
  const [frameSize, setFrameSize] = useState(
    initial?.frameSize ??
      readStorage("frameSize", { width: 700, height: 350 }),
  );
  const [isProjectActive, setIsProjectActive] = useState(
    initial?.isProjectActive ?? readStorage<boolean>("isProjectActive", false),
  );
  const [previewAnimation, setPreviewAnimation] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(
    readStorage<string | null>("currentProjectId", null),
  );
  const [projectName, setProjectName] = useState(
    readStorage<string>("projectName", "Untitled"),
  );

  // ── Persist to localStorage whenever these values change ──────────────────
  useEffect(() => { writeStorage("layers", layers); }, [layers]);
  useEffect(() => { writeStorage("elementProperties", elementProperties); }, [elementProperties]);
  useEffect(() => { writeStorage("frameSize", frameSize); }, [frameSize]);
  useEffect(() => { writeStorage("isProjectActive", isProjectActive); }, [isProjectActive]);
  useEffect(() => { writeStorage("currentProjectId", currentProjectId); }, [currentProjectId]);
  useEffect(() => { writeStorage("projectName", projectName); }, [projectName]);
  useEffect(() => { writeStorage("paintColor", paintColor); }, [paintColor]);
  useEffect(() => { writeStorage("selectedShapeKind", selectedShapeKind); }, [selectedShapeKind]);

  // Mark dirty whenever state that affects the document changes.
  // isProjectActive is excluded from the dep array intentionally: merely
  // activating a project (opening a blank canvas) should not flag dirty.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    // Intentionally marks dirty in an effect: document mutations can come from
    // many places, and we must exclude isProjectActive from the deps so simply
    // opening a project doesn't flag the document as dirty.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isProjectActive) setIsDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, elementProperties, frameSize]);

  // Keep the per-layer `active` flag in sync with a selection. Shared by every
  // selection path (panel, canvas, rubber-band) so the panel highlight and the
  // canvas highlight can never drift apart. Returns the previous array when
  // nothing changed, which keeps re-render loops impossible.
  const syncActiveFlags = useCallback(
    (next: readonly string[]) => {
      setLayers((prevLayers) => {
        let changed = false;
        const updated = prevLayers.map((layer) => {
          const isActive = next.includes(layer.id);
          if ((layer.active === true) === isActive) return layer;
          changed = true;
          return { ...layer, active: isActive };
        });
        return changed ? updated : prevLayers;
      });
    },
    [setLayers],
  );

  // Raw selection writes (keyboard select-all, ungroup, import, …) must refresh
  // the per-layer `active` flags too. Without this, `selectedLayerIds` and
  // `layer.active` drift: Ctrl+A reported "3 layers selected" while only one row
  // was highlighted and the context menu kept Group/Boolean disabled.
  const setSelectedLayerIdsSynced = useCallback<React.Dispatch<React.SetStateAction<string[]>>>(
    (action) => {
      setSelectedLayerIds((prev) => {
        const next =
          typeof action === "function"
            ? (action as (previous: string[]) => string[])(prev)
            : action;
        // Microtask: never schedule a sibling state update from inside an updater.
        queueMicrotask(() => syncActiveFlags(next));
        return next;
      });
    },
    [syncActiveFlags],
  );

  // Replace the selection with an already-resolved id list.
  const setSelection = useCallback(
    (ids: readonly string[]) => {
      const next = [...new Set(ids)];
      setSelectedLayerIds(next);
      setSelectedLayerId(next.length > 0 ? next[0] : null);
      syncActiveFlags(next);
    },
    [syncActiveFlags],
  );

  // Multi-select action: Figma click / Ctrl+click behavior
  const selectLayer = useCallback(
    (id: string, mode?: LayerSelectMode) => {
      const additive =
        mode === true ||
        (typeof mode === "object" && mode !== null && mode.additive === true);

      if (!additive) {
        setSelection([id]);
        return;
      }

      setSelectedLayerIds((prev) => {
        const next = prev.includes(id)
          ? prev.filter((lid) => lid !== id)
          : [...prev, id];
        // Batch dependent state updates via microtask to avoid nesting setState calls
        queueMicrotask(() => {
          setSelectedLayerId(next.length > 0 ? next[0] : null);
          syncActiveFlags(next);
        });
        return next;
      });
    },
    [setSelection, syncActiveFlags],
  );

  // Clear all selection
  const clearSelection = useCallback(() => {
    setSelection([]);
  }, [setSelection]);

  const value: EditorContextValue = {
    activeTool,
    selectedShapeKind,
    paintColor,
    isEditingText,
    selectedLayerId,
    selectedLayerIds,
    layers,
    elementProperties,
    frameSize,
    isProjectActive,
    setActiveTool,
    setSelectedShapeKind,
    setPaintColor,
    setIsEditingText,
    setSelectedLayerId,
    setSelectedLayerIds: setSelectedLayerIdsSynced,
    selectLayer,
    setSelection,
    clearSelection,
    setLayers,
    setElementProperties,
    setFrameSize,
    setIsProjectActive,
    previewAnimation,
    setPreviewAnimation,
    scrubTime,
    setScrubTime,
    isDirty,
    markClean: () => setIsDirty(false),
    currentProjectId,
    setCurrentProjectId,
    projectName,
    setProjectName,
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return ctx;
}
