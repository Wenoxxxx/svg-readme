import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  MIN_TEXTBOX_SIZE,
  MIN_SHAPE_SIZE,
  DEFAULT_TEXT_HEIGHT,
  type CanvasProps,
} from "./types";
import {
  getElementBoundingBox,
} from "./ElementsRenderer";
import { getElementSnapBounds } from "./boundingBox";
import {
  getToolHandler,
} from "../../lib/editor-tools/registry";
import {
  startPathFromPoint,
  addOrCloseVertex,
  beginPendingHandle,
  updatePendingHandle,
  commitPendingHandle,
  closePathFromDoubleClick,
  CLOSE_THRESHOLD,
} from "../../lib/editor-tools/PenTool";
import {
  type ToolEventContext,
  type ToolInteractionState,
} from "../../lib/editor-tools/types";
import {
  computeRubberBandIntersections,
  computeDragPosition,
  computeMultiDragDeltas,
} from "../../lib/editor-tools/MoveTool";
import {
  updateResizeWorld,
  snapResizeBox,
} from "../../lib/editor-tools/ResizeHandler";
import {
  updateRotation,
  computeMultiRotation,
} from "../../lib/editor-tools/RotateHandler";
import {
  startPan,
  updatePan,
  computeWheelViewport,
} from "../../lib/editor-tools/PanZoomHandler";
import { screenToWorld, clampZoom, computeSnapGuides, remapBoxesThroughBounds, sameGuideLines, getLockedLayerIds, type SnapGuideLine } from "../../lib/editor/geometry";
import { lineFromDrag } from "./shapeHelpers";
import { mergeState } from "./Canvas/helpers";
import type { ElementProperties } from "./ElementsRenderer";
import type { LayerType } from "../../context/EditorContext";

// ─── Hook params ──────────────────────────────────────────────────────────────

export interface UseCanvasInteractionParams {
  // Component props
  activeTool: CanvasProps["activeTool"];
  selectedShapeKind?: CanvasProps["selectedShapeKind"];
  layers: LayerType[];
  selectedLayerId: string | null;
  selectedLayerIds: string[];
  isEditingText: boolean;
  elementProperties: Record<string, ElementProperties>;
  viewport: NonNullable<CanvasProps["viewport"]>;
  snapEnabled: boolean;
  gridSize: number;

  // Callbacks
  onCommitText?: () => void;
  onViewportChange?: (viewport: NonNullable<CanvasProps["viewport"]>) => void;
  onSelectLayer: (id: string | null) => void;
  onShiftSelectLayer?: (id: string) => void;
  onClearSelection?: () => void;
  onRubberBandSelect?: (ids: string[], addToExisting: boolean) => void;
  onMoveStart?: () => void;
  onMoveElement: (id: string, x: number, y: number) => void;
  onResizeElement?: (id: string, x: number, y: number, width: number, height: number) => void;
  onRotateElement?: (id: string, rotation: number) => void;
  onCreateText: (x: number, y: number, width: number | "auto", height: number) => void;
  onCreateShape: CanvasProps["onCreateShape"];
  /** Alt+drag: duplicate `ids` and return the old→new id map (or null). */
  onDuplicateForDrag?: CanvasProps["onDuplicateForDrag"];
  onPaintLayer: (layerId: string, color: string) => void;
  paintColor?: string;
  onEditText: (layerId: string) => void;

  // Refs & state
  svgRef: React.RefObject<SVGSVGElement | null>;
  setState: Dispatch<SetStateAction<ToolInteractionState>>;
  /** Current pathDragState from Canvas state — used to keep keyboard/tool-switch handlers fresh. */
  pathDragState?: ToolInteractionState["pathDragState"];

  // Path finalization
  finalizePath: (ps: NonNullable<ToolInteractionState["pathDragState"]>) => void;
  /** Callback for creating a path (kept in ref for keyboard handler). */
  onCreatePath?: CanvasProps["onCreatePath"];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCanvasInteraction({
  activeTool,
  selectedShapeKind,
  layers,
  selectedLayerId,
  selectedLayerIds,
  isEditingText,
  elementProperties,
  viewport,
  snapEnabled,
  gridSize,
  onCommitText,
  onViewportChange,
  onSelectLayer,
  onShiftSelectLayer,
  onClearSelection,
  onRubberBandSelect,
  onMoveStart,
  onMoveElement,
  onResizeElement,
  onRotateElement,
  onCreateText,
  onCreateShape,
  onDuplicateForDrag,
  onPaintLayer,
  paintColor,
  onEditText,
  svgRef,
  setState,
  pathDragState,
  finalizePath,
  onCreatePath,
}: UseCanvasInteractionParams) {
  const spacePressedRef = useRef(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const moveHistorySavedRef = useRef(false);
  const lastPenClickRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  /** Alt+drag: old→new id map once the selection has been duplicated for the
   *  current drag (null = not duplicated yet). Reset on mouseup. */
  const dragDuplicateMapRef = useRef<Record<string, string> | null>(null);

  /** Locked layers (directly or via a locked ancestor) — never hit-testable. */
  const lockedLayerIds = useMemo(() => getLockedLayerIds(layers), [layers]);
  const zoom = clampZoom(viewport.zoom);

  // Path state refs for pen tool keyboard shortcuts — kept in sync from props (fixes stale-ref bug
  // where Esc/Enter/C and tool-switch finalize never fired, leaving dashed line following cursor).
  const pathBuildingRef = useRef(false);
  const pathStateRef = useRef<ToolInteractionState["pathDragState"]>(null);
  const onCreatePathRef = useRef<CanvasProps["onCreatePath"]>(() => {});
  useEffect(() => {
    pathBuildingRef.current = pathDragState?.isBuilding ?? false;
  }, [pathDragState?.isBuilding]);
  useEffect(() => {
    pathStateRef.current = pathDragState ?? null;
  }, [pathDragState]);
  useEffect(() => {
    if (onCreatePath) onCreatePathRef.current = onCreatePath;
  }, [onCreatePath]);

  // ── Spacebar detection (Figma-style hold-to-hand) ───────────────────────
  useEffect(() => {
    const isInputFocused = () => {
      const target = document.activeElement;
      if (!target) return false;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return true;
        if (target.isContentEditable) return true;
      }
      return false;
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      // Don't hijack space while editing text or typing in an input
      if (isEditingText) return;
      if (isInputFocused()) return;
      // Prevent page scroll and button activation while holding space for hand
      // tool — including auto-repeat keydowns, which would otherwise scroll.
      e.preventDefault();
      if (e.repeat) return;
      spacePressedRef.current = true;
      setIsSpaceHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spacePressedRef.current = false;
      setIsSpaceHeld(false);
    };
    const onBlur = () => {
      spacePressedRef.current = false;
      setIsSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", onBlur);
    };
  }, [isEditingText]);

  // ── Pen tool: Enter/Escape to finalize/cancel path ──────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeTool !== "pen" || !pathBuildingRef.current) return;
      if (e.key === "Enter") {
        e.preventDefault();
        let ps = pathStateRef.current;
        if (!ps?.isBuilding || ps.points.length < 2) return;
        if (ps.pendingHandleVertex != null) {
          const committed = commitPendingHandle({ pathDragState: ps });
          if (committed.pathDragState) ps = committed.pathDragState;
        }
        finalizePath(ps);
      } else if (e.key === "Escape") {
        e.preventDefault();
        // Exit should KEEP what's been drawn (finalize open path if >=2 points),
        // not discard everything. Single-point exit just cancels.
        let ps = pathStateRef.current;
        if (!ps?.isBuilding) {
          setState((prev) => ({ ...prev, pathDragState: null }));
          return;
        }
        if (ps.pendingHandleVertex != null) {
          const committed = commitPendingHandle({ pathDragState: ps });
          if (committed.pathDragState) ps = committed.pathDragState;
        }
        if (ps.points.length >= 2) {
          finalizePath(ps);
        } else {
          setState((prev) => ({ ...prev, pathDragState: null }));
        }
      } else if ((e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const ps = pathStateRef.current;
        if (ps?.isBuilding && ps.points.length >= 3) {
          const next = closePathFromDoubleClick({ pathDragState: ps } as ToolInteractionState);
          if (next.pathDragState) {
            finalizePath(next.pathDragState);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTool, finalizePath, setState]);

  // ── Tab cycles overlapping layers at the pointer (B4) ───────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || activeTool !== "move") return;
      if (isEditingText) return;
      // Never steal Tab from form fields / contenteditable (focus navigation).
      const target = (e.target instanceof Element ? e.target : null) ?? document.activeElement;
      if (
        target instanceof Element &&
        (target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']") ||
          (target instanceof HTMLElement && target.isContentEditable))
      ) return;
      const point = lastPointerRef.current;
      if (!point) return;
      const candidates = layers
        .filter((l) => l.visible && elementProperties[l.id] && !lockedLayerIds.has(l.id))
        .filter((l) => {
          const bb = getElementBoundingBox(elementProperties[l.id]);
          return (
            point.x >= bb.x &&
            point.x <= bb.x + bb.width &&
            point.y >= bb.y &&
            point.y <= bb.y + bb.height
          );
        })
        .reverse()
        .map((l) => l.id);
      if (candidates.length === 0) return;
      e.preventDefault();
      const currentIdx =
        selectedLayerIds.length === 1
          ? candidates.indexOf(selectedLayerIds[0])
          : -1;
      const next = candidates[(currentIdx + 1) % candidates.length];
      onSelectLayer(next);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTool, layers, elementProperties, selectedLayerIds, onSelectLayer, isEditingText, lockedLayerIds]);

  // ── Derived selection ────────────────────────────────────────────────────
  const selectedId =
    selectedLayerIds && selectedLayerIds.length > 0
      ? selectedLayerIds.length === 1
        ? selectedLayerIds[0]
        : null
      : selectedLayerId || null;
  const selectedProps = selectedId ? elementProperties[selectedId] : null;

  const visibleLayerIds = useMemo(
    () => layers.filter((layer) => layer.visible && elementProperties[layer.id]).map((layer) => layer.id),
    [layers, elementProperties],
  );
  /** Visible AND unlocked — the only layers marquee selection may pick. */
  const selectableLayerIds = useMemo(
    () => visibleLayerIds.filter((id) => !lockedLayerIds.has(id)),
    [visibleLayerIds, lockedLayerIds],
  );
  /** Snap-target boxes (unpadded) of every visible layer not in `excluded`.
   *  Locked layers still act as snap targets, like in Figma. */
  const selectableOrVisibleSiblings = useCallback(
    (excluded: ReadonlySet<string>) =>
      visibleLayerIds
        .filter((id) => !excluded.has(id))
        .map((id) => {
          const props = elementProperties[id];
          return props ? getElementSnapBounds(props) : null;
        })
        .filter((bb): bb is ReturnType<typeof getElementSnapBounds> => bb !== null),
    [visibleLayerIds, elementProperties],
  );

  // ── Get SVG coords ───────────────────────────────────────────────────────
  const getSVGCoords = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const svg = svgRef.current;
      if (!svg) return { x: e.clientX, y: e.clientY };
      const rect = svg.getBoundingClientRect();
      return screenToWorld(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        { ...viewport, panX: 0, panY: 0 },
      );
    },
    [viewport, svgRef],
  );

  // ── Build tool event context ─────────────────────────────────────────────
  const buildContext = useCallback(
    (e: React.MouseEvent): ToolEventContext => ({
      event: e,
      worldPoint: getSVGCoords(e),
      screenPoint: { x: e.clientX, y: e.clientY },
      selectedId,
      selectedLayerIds,
      selectedProps,
      elementProperties,
      isEditingText,
      viewport,
      snapEnabled,
      gridSize,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      lockedLayerIds,
    }),
    [
      lockedLayerIds,
      getSVGCoords,
      selectedId,
      selectedLayerIds,
      selectedProps,
      elementProperties,
      isEditingText,
      viewport,
      snapEnabled,
      gridSize,
    ],
  );

  // ── Canvas mouse down ────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, _state: ToolInteractionState) => {
      e.preventDefault();

      // Right-click is owned by the context-menu hook (onCanvasContextMenu /
      // onElementContextMenu): never start a marquee, pan or drag from it, and
      // never let it clear the selection.
      if (e.button === 2) return;

      if (e.button === 1 || spacePressedRef.current) {
        setState((prev) => ({ ...prev, ...startPan(e, viewport) }));
        return;
      }

      if (isEditingText) onCommitText?.();

      if (activeTool === "pen") {
        const ctx = buildContext(e);
        const { x, y } = ctx.worldPoint;
        const now = Date.now();
        const last = lastPenClickRef.current;
        // Distances are screen-pixel based: divide by zoom to get world units.
        const isDoubleClick =
          !!last &&
          now - last.t < 350 &&
          Math.hypot(x - last.x, y - last.y) < 10 / zoom;
        lastPenClickRef.current = { t: now, x, y };

        setState((prev) => {
          if (!prev.pathDragState?.isBuilding) {
            const started = { ...prev, ...mergeState(startPathFromPoint(x, y)) };
            return {
              ...started,
              ...mergeState(beginPendingHandle(started, 0, [x, y])),
            };
          }
          if (isDoubleClick) return prev;
          const nextState = { ...prev, ...mergeState(addOrCloseVertex(prev, x, y, CLOSE_THRESHOLD / zoom)) };
          if (nextState.pathDragState?.isBuilding) {
            const index = nextState.pathDragState.points.length - 1;
            return {
              ...nextState,
              ...mergeState(beginPendingHandle(nextState, index, [x, y])),
            };
          }
          return nextState;
        });
        return;
      }

      const ctx = buildContext(e);
      const tool = getToolHandler(activeTool, selectedShapeKind);
      const next = tool.onCanvasMouseDown?.(ctx);
      if (next) setState((prev) => ({ ...prev, ...mergeState(next) }));
    },
    [activeTool, selectedShapeKind, isEditingText, buildContext, onCommitText, viewport, zoom, setState],
  );

  // ── Element mouse down ───────────────────────────────────────────────────
  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, layerId: string, _state: ToolInteractionState) => {
      // Right-click opens the selection context menu instead of starting a drag.
      // Selection-on-right-click is handled there so a multi-selection survives.
      if (e.button === 2) return;
      // Figma-style: hold Space to pan even when clicking an element
      if (e.button === 1 || spacePressedRef.current) {
        e.stopPropagation();
        setState((prev) => ({ ...prev, ...startPan(e, viewport) }));
        return;
      }
      // Locked layers (or children of locked groups) are not hit-testable:
      // behave exactly like a press on empty canvas.
      if (lockedLayerIds.has(layerId)) {
        e.stopPropagation();
        handleMouseDown(e, _state);
        return;
      }
      // Creation tools create on top of existing elements (Figma): the press
      // starts a new shape / pen vertex / text box instead of selecting.
      if (
        activeTool === "shape" ||
        activeTool === "pen" ||
        (activeTool === "text" && elementProperties[layerId]?.type !== "text")
      ) {
        e.stopPropagation();
        handleMouseDown(e, _state);
        return;
      }
      e.stopPropagation();
      // Guard: missing props should not crash — stale id from a bad document
      const targetProps = elementProperties[layerId];
      if (!targetProps) return;
      if (isEditingText) {
        onCommitText?.();
      }

      if (activeTool === "move") {
        if (e.altKey) {
          const layer = layers.find((l) => l.id === layerId);
          if (layer?.parentId) {
            onSelectLayer(layer.parentId);
            return;
          }
        }
        if (e.shiftKey) {
          onShiftSelectLayer?.(layerId);
          return;
        } else {
          onSelectLayer(layerId);
        }
      } else if (activeTool === "text") {
        const props = elementProperties[layerId];
        if (props && props.type === "text") {
          onEditText(layerId);
          return;
        }
      } else if (activeTool === "paint") {
        const props = elementProperties[layerId];
        if (props) {
          onSelectLayer(layerId);
          onPaintLayer(layerId, paintColor ?? "#3b82f6");
        }
        return;
      }

      const ctx = buildContext(e);
      const tool = getToolHandler(activeTool, selectedShapeKind);
      const next = tool.onElementMouseDown?.(ctx, layerId);
      if (next) setState((prev) => ({ ...prev, ...mergeState(next) }));
    },
    [
      activeTool,
      selectedShapeKind,
      isEditingText,
      layers,
      elementProperties,
      viewport,
      lockedLayerIds,
      handleMouseDown,
      onSelectLayer,
      onShiftSelectLayer,
      onEditText,
      onPaintLayer,
      paintColor,
      onCommitText,
      buildContext,
      setState,
    ],
  );

  // ── Element double click ─────────────────────────────────────────────────
  const handleElementDoubleClick = useCallback(
    (e: React.MouseEvent, layerId: string) => {
      // Prevent the SVG's own onDoubleClick (pen-tool close) from firing
      e.stopPropagation();
      // If already editing, commit first then re-enter — avoids stale dragState
      if (isEditingText) onCommitText?.();
      if (activeTool !== "move") return;
      const props = elementProperties[layerId];
      // Defensive: props may be missing after a bad import/undo — fall back to layer lookup
      const isTextLike =
        (props && props.type === "text") ||
        layers.find((l) => l.id === layerId)?.type === "text";
      if (isTextLike) {
        // Clear any drag/rubberBand left by the second mousedown of the double-click
        setState((prev) => ({ ...prev, dragState: null, rubberBandState: null, rubberBandHighlightedIds: [] }));
        // Only enter edit if props actually exists — otherwise EditorInner guard will no-op
        if (props && props.type === "text") {
          onEditText(layerId);
        } else {
          // Props missing: still try — EditorInner will guard and not crash
          onEditText(layerId);
        }
        return;
      }
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;
      const targetId =
        layer.type === "group" ? layer.id : (layer.parentId ?? null);
      if (targetId) onSelectLayer(targetId);
    },
    [activeTool, layers, elementProperties, onEditText, onSelectLayer, isEditingText, onCommitText, setState],
  );

  // ── Mouse move ───────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent, state: ToolInteractionState) => {
      const ctx = buildContext(e);
      lastPointerRef.current = ctx.worldPoint;

      if (state.panState) {
        onViewportChange?.(updatePan(state.panState, e.clientX, e.clientY, viewport));
        return;
      }

      if (state.rotateState) {
        if (state.rotateState.selectionIds && state.rotateState.initialRotations) {
          // Multi-rotate: every element orbits the selection center (Figma);
          // Shift snaps the increment to 15°.
          const next = computeMultiRotation(
            state.rotateState,
            ctx.worldPoint.x,
            ctx.worldPoint.y,
            ctx.shiftKey,
          );
          for (const [id, r] of Object.entries(next)) {
            if (r.x !== undefined && r.y !== undefined) onMoveElement(id, r.x, r.y);
            onRotateElement?.(id, r.rotation);
          }
          return;
        }
        const rotation = updateRotation(state.rotateState, ctx.worldPoint.x, ctx.worldPoint.y, ctx.shiftKey);
        onRotateElement?.(state.rotateState.elementId, rotation);
        return;
      }

      if (state.resizeState) {
        const rs = state.resizeState;
        const dx = ctx.worldPoint.x - rs.startX;
        const dy = ctx.worldPoint.y - rs.startY;
        // Rotation-aware: the delta is converted into the element's local frame
        // and the opposite handle stays anchored in world space.
        const box = updateResizeWorld(rs, dx, dy, ctx.shiftKey, ctx.altKey);
        let finalX = box.x, finalY = box.y, finalW = box.width, finalH = box.height;
        let snapGuideLines: SnapGuideLine[] = [];

        // Smart guides only for axis-aligned boxes, and not while Shift locks
        // the aspect ratio (snapping one edge would break the ratio).
        if (snapEnabled && !rs.rotation && !ctx.shiftKey) {
          const excluded = new Set(rs.selectionIds ?? [rs.elementId]);
          const siblingBounds = selectableOrVisibleSiblings(excluded);
          const minSize = rs.isLine ? 0 : rs.isText ? MIN_TEXTBOX_SIZE : MIN_SHAPE_SIZE;
          // Only the edges the handle drags are snapped — the anchor never moves.
          const snap = snapResizeBox(box, rs.handle, siblingBounds, { altKey: ctx.altKey, minSize });
          finalX = snap.box.x;
          finalY = snap.box.y;
          finalW = snap.box.width;
          finalH = snap.box.height;
          snapGuideLines = snap.guides;
        }

        if (state.resizeState.selectionIds && state.resizeState.initialBoxes && state.resizeState.initialSelectionBounds) {
          const mapped = remapBoxesThroughBounds(
            state.resizeState.initialBoxes,
            state.resizeState.initialSelectionBounds,
            { x: finalX, y: finalY, width: finalW, height: finalH },
          );
          for (const id of state.resizeState.selectionIds) {
            const box = mapped[id];
            if (!box) continue;
            onResizeElement?.(
              id,
              box.x,
              box.y,
              Math.max(box.width, MIN_SHAPE_SIZE),
              Math.max(box.height, MIN_SHAPE_SIZE),
            );
          }
        } else {
          onResizeElement?.(state.resizeState.elementId, finalX, finalY, finalW, finalH);
        }
        if (!sameGuideLines(snapGuideLines, state.snapGuideLines)) {
          setState((prev) => ({ ...prev, snapGuideLines }));
        }
        return;
      }

      if (state.dragState) {
        const ds = state.dragState;
        // Alt+drag: duplicate the selection once the pointer really moves, then
        // drag the copies (the originals stay where they were).
        let idMap: Record<string, string> | null = null;
        if (ds.duplicateOnMove) {
          if (!dragDuplicateMapRef.current) {
            const movedPx = Math.hypot(ctx.worldPoint.x - ds.startX, ctx.worldPoint.y - ds.startY) * zoom;
            if (movedPx < 2) return;
            if (!moveHistorySavedRef.current) {
              moveHistorySavedRef.current = true;
              onMoveStart?.();
            }
            const ids = ds.multiStartPositions ? Object.keys(ds.multiStartPositions) : [ds.elementId];
            dragDuplicateMapRef.current = onDuplicateForDrag?.(ids) ?? {};
          }
          idMap = dragDuplicateMapRef.current;
        }
        const target = (id: string) => idMap?.[id] ?? id;

        if (!moveHistorySavedRef.current) {
          moveHistorySavedRef.current = true;
          onMoveStart?.();
        }
        if (ds.multiStartPositions) {
          const { dx, dy, snapDelta } = computeMultiDragDeltas(
            ds,
            ctx.worldPoint,
            snapEnabled,
            gridSize,
            ctx.shiftKey,
          );
          for (const [id, pos] of Object.entries(ds.multiStartPositions)) {
            onMoveElement(target(id), pos.x + dx + snapDelta.x, pos.y + dy + snapDelta.y);
          }
        } else {
          const draggedId = ds.elementId;
          const draggedProps = elementProperties[draggedId];
          const rawPos = computeDragPosition(ds, ctx.worldPoint, snapEnabled, gridSize, ctx.shiftKey);
          let finalPos = rawPos;
          let snapGuideLines: SnapGuideLine[] = [];

          if (snapEnabled && draggedProps) {
            // Unpadded snap boxes: text's 2px hit padding must not offset the snap.
            const draggedBounds = getElementSnapBounds({ ...draggedProps, x: rawPos.x, y: rawPos.y } as ElementProperties);
            const siblingBounds = selectableOrVisibleSiblings(new Set([draggedId, target(draggedId)]));
            const snap = computeSnapGuides(draggedBounds, siblingBounds);
            if ((snap.position.x !== draggedBounds.x || snap.position.y !== draggedBounds.y) && snap.guides.length > 0) {
              // Shift the element by the box's snap delta (box ≠ element origin for some types).
              finalPos = {
                x: rawPos.x + (snap.position.x - draggedBounds.x),
                y: rawPos.y + (snap.position.y - draggedBounds.y),
              };
              // Keep a Shift-constrained axis exactly on its start value.
              if (ctx.shiftKey) {
                const startPos = { x: ds.startX - ds.offsetX, y: ds.startY - ds.offsetY };
                if (rawPos.x === startPos.x) finalPos.x = rawPos.x;
                if (rawPos.y === startPos.y) finalPos.y = rawPos.y;
              }
              snapGuideLines = snap.guides;
            }
          }

          onMoveElement(target(draggedId), finalPos.x, finalPos.y);
          if (!sameGuideLines(snapGuideLines, state.snapGuideLines)) {
            setState((prev) => ({ ...prev, snapGuideLines }));
          }
        }
        return;
      }

      if (state.rubberBandState) {
        const newBand = {
          ...state.rubberBandState,
          currentX: ctx.worldPoint.x,
          currentY: ctx.worldPoint.y,
        };
        setState((prev) => ({
          ...prev,
          rubberBandState: newBand,
          rubberBandHighlightedIds: computeRubberBandIntersections(newBand, elementProperties, selectableLayerIds),
        }));
        return;
      }

      if (state.pathDragState?.isBuilding) {
        const point: [number, number] = [ctx.worldPoint.x, ctx.worldPoint.y];
        const next = updatePendingHandle(state, point);
        if (next.pathDragState) {
          setState((prev) => ({ ...prev, ...mergeState(next) }));
        }
        return;
      }

      const tool = getToolHandler(activeTool, selectedShapeKind);
      const next = tool.onMouseMove?.(ctx, state);
      if (next) setState((prev) => ({ ...prev, ...mergeState(next) }));
    },
    [
      activeTool,
      selectedShapeKind,
      viewport,
      buildContext,
      onViewportChange,
      onRotateElement,
      onResizeElement,
      onMoveStart,
      onMoveElement,
      onDuplicateForDrag,
      elementProperties,
      selectableLayerIds,
      selectableOrVisibleSiblings,
      snapEnabled,
      gridSize,
      zoom,
      setState,
    ],
  );

  // ── Mouse up ─────────────────────────────────────────────────────────────
  const handleMouseUp = useCallback(
    (state: ToolInteractionState) => {
      if (state.panState) {
        setState((prev) => ({ ...prev, panState: null }));
        return;
      }
      if (state.rotateState) {
        setState((prev) => ({ ...prev, rotateState: null }));
        return;
      }
      if (state.resizeState) {
        setState((prev) => ({ ...prev, resizeState: null, snapGuideLines: [] }));
        return;
      }
      if (state.dragState) {
        moveHistorySavedRef.current = false;
        dragDuplicateMapRef.current = null;
        setState((prev) => ({
          ...prev,
          dragState: null,
          snapGuideLines: [],
        }));
        return;
      }
      if (state.rubberBandState) {
        const dx = state.rubberBandState.currentX - state.rubberBandState.startX;
        const dy = state.rubberBandState.currentY - state.rubberBandState.startY;

        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
          if (!state.rubberBandState.addToExisting) {
            if (onClearSelection) onClearSelection();
            else onSelectLayer(null);
          }
        } else {
          const intersecting = computeRubberBandIntersections(
            state.rubberBandState,
            elementProperties,
            selectableLayerIds,
          );
          onRubberBandSelect?.(intersecting, state.rubberBandState.addToExisting);
        }

        setState((prev) => ({
          ...prev,
          rubberBandState: null,
          rubberBandHighlightedIds: [],
        }));
        return;
      }
      if (state.textDragState) {
        const { startX, startY, currentX, currentY } = state.textDragState;
        const dx = currentX - startX;
        const dy = currentY - startY;

        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
          onCreateText(startX, startY, "auto", DEFAULT_TEXT_HEIGHT);
        } else {
          const fw = Math.max(Math.abs(dx), MIN_TEXTBOX_SIZE);
          const fh = Math.max(Math.abs(dy), MIN_TEXTBOX_SIZE);
          onCreateText(Math.min(startX, currentX), Math.min(startY, currentY), fw, fh);
        }
        setState((prev) => ({ ...prev, textDragState: null }));
        return;
      }
      if (state.shapeDragState) {
        const { kind, startX, startY, currentX, currentY, shiftKey } = state.shapeDragState;
        if (kind === "line") {
          // Lines keep their drag direction (diagonal lines stay diagonal);
          // Shift snaps the angle to 45° steps.
          const line = lineFromDrag(startX, startY, currentX, currentY, shiftKey);
          onCreateShape(kind, line.x, line.y, line.width, line.height, { lineDirection: line.lineDirection });
          setState((prev) => ({ ...prev, shapeDragState: null }));
          return;
        }
        const dx = currentX - startX;
        const dy = currentY - startY;
        const isClick = Math.abs(dx) < 3 && Math.abs(dy) < 3;
        const DS = 80;
        let fw = isClick ? DS : Math.max(Math.abs(dx), MIN_SHAPE_SIZE);
        let fh = isClick ? DS : Math.max(Math.abs(dy), MIN_SHAPE_SIZE);
        let fx = isClick ? startX - DS / 2 : Math.min(startX, currentX);
        let fy = isClick ? startY - DS / 2 : Math.min(startY, currentY);

        // Shift constraint: force 1:1 aspect ratio (perfect square / circle)
        if (!isClick && shiftKey) {
          const side = Math.max(Math.abs(dx), Math.abs(dy));
          fw = side;
          fh = side;
          // Re-anchor position so the shape grows from the start point
          fx = dx >= 0 ? startX : startX - side;
          fy = dy >= 0 ? startY : startY - side;
        }

        onCreateShape(kind, fx, fy, fw, fh);
        setState((prev) => ({ ...prev, shapeDragState: null }));
        return;
      }
      if (state.pathDragState) {
        if (state.pathDragState.isBuilding) {
          if (state.pathDragState.pendingHandleVertex != null) {
            const next = commitPendingHandle(state);
            if (next.pathDragState) {
              setState((prev) => ({ ...prev, ...mergeState(next) }));
            }
          }
          return;
        }
        finalizePath(state.pathDragState);
        return;
      }
    },
    [
      onClearSelection,
      onSelectLayer,
      onRubberBandSelect,
      onCreateText,
      onCreateShape,
      finalizePath,
      elementProperties,
      selectableLayerIds,
      setState,
    ],
  );

  // ── Wheel zoom ───────────────────────────────────────────────────────────
  // Native (non-passive) WheelEvent handler — Canvas registers it with
  // addEventListener(..., { passive: false }) so preventDefault() actually
  // stops browser page-zoom on ctrl+wheel / pinch. Ctrl/Cmd+wheel and pinch
  // zoom around the cursor; plain wheel pans (Shift = horizontal).
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (!onViewportChange) return;
      const svg = svgRef.current;
      if (!svg) return;
      onViewportChange(computeWheelViewport(e, viewport, svg.getBoundingClientRect()));
    },
    [onViewportChange, viewport, svgRef],
  );

  // ── Pen tool: double-click closes path ──────────────────────────────────
  const handleDoubleClick = useCallback(
    (state: ToolInteractionState) => {
      if (activeTool === "pen" && state.pathDragState?.isBuilding) {
        const next = closePathFromDoubleClick(state);
        if (next.pathDragState) {
          finalizePath(next.pathDragState);
        }
      }
    },
    [activeTool, finalizePath],
  );

  // ── Finalize in-progress path when tool changes ──────────────────────────
  const prevActiveToolRef = useRef(activeTool);
  useEffect(() => {
    const prev = prevActiveToolRef.current;
    prevActiveToolRef.current = activeTool;
    if (prev === "pen" && activeTool !== "pen" && pathStateRef.current?.isBuilding) {
      let ps = pathStateRef.current;
      if (ps.pendingHandleVertex != null) {
        const committed = commitPendingHandle({ pathDragState: ps });
        if (committed.pathDragState) ps = committed.pathDragState;
      }
      // Only finalize if we have at least 2 points; otherwise just cancel
      if (ps.points.length >= 2) {
        finalizePath(ps);
      } else {
        setState((prev) => ({ ...prev, pathDragState: null }));
      }
    }
  }, [activeTool, finalizePath, setState]);

  // ── Window mouseup for drags that leave the SVG ──────────────────────────
  // Note: The window mouseup listener is managed by Canvas itself since it
  // needs access to the current state.

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleElementMouseDown,
    handleElementDoubleClick,
    handleDoubleClick,
    handleWheel,
    getSVGCoords,
    buildContext,
    selectedId,
    selectedProps,
    visibleLayerIds,
    lockedLayerIds,
    spacePressedRef,
    isSpaceHeld,
    moveHistorySavedRef,
    lastPointerRef,
    pathBuildingRef,
    pathStateRef,
    onCreatePathRef,
  };
}
