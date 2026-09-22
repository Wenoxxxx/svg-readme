import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Stack,
  Plus,
  FolderPlus,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import LayerContextMenu, { type ContextMenuItem } from "./LayerContextMenu";
import { buildSelectionContextMenu } from "./contextMenuItems";
import type { LayerType } from "../../context/EditorContext";
import type { ElementProperties } from "../editor-canvas/ElementsRenderer";

import { LayerItem } from "./LayerPanel/LayerItem";
import {
  buildLayerTreeIndex,
  layerSelectionForTarget,
  visibleLayerRows,
} from "../../lib/editor/layerTree/model";
import {
  canDropOnLayer,
  resolveDragInstruction,
  resolveDropTarget,
} from "../../lib/editor/layerTree/dragInstruction";
import type {
  LayerDragInstruction,
  LayerRow,
  LayerSelectionMode,
} from "../../lib/editor/layerTree/types";
import { reorderChild } from "../../lib/editor/documentActions";
import { isClipboardReadable } from "../../lib/editor/layerOps/clipboardOps";
import { LAYER_TREE_ROW_HEIGHT } from "./LayerPanel/geometry";
import { layerPanelTheme as chrome } from "./LayerPanel/theme";
import { useRowVirtualizer } from "./LayerPanel/useRowVirtualizer";

// i18n note (Phase 6): this app has no i18n/string-source module — there is no
// `useI18n`, `t()` or dictionary anywhere under `app/src`. Per the phase plan we
// therefore keep the literals literal rather than inventing a framework, and
// centralise them here:
//   • command labels/shortcuts live in `lib/editor/commands/layerCommands.ts`
//   • panel chrome labels (header, toolbar titles, empty state) live below
//   • context-menu labels are rendered from the command registry
// When an i18n layer does land, those three points are the only places to route.

interface LayerPanelProps {
  layers: LayerType[];
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  /** Layer properties used to decide which context-menu ops apply (boolean, masks…). */
  elementProperties?: Record<string, ElementProperties>;
  onAdd?: (layer: LayerType, insertIndex: number) => void;
  onReorder?: (ordered: { id: string; orderIndex: number }[]) => void;
  onRename?: (id: string, name: string) => void;
  onToggleVisibility?: (id: string, visible: boolean) => void;
  onToggleLock?: (id: string, locked: boolean) => void;
  onDelete?: (id: string) => void;
  onToggleCollapse?: (id: string, collapsed: boolean) => void;
  /** Called when a context menu action is triggered */
  onContextAction?: (actionId: string, layerId: string) => void;
  /**
   * Called with the resolved selection after a row click (plain / Ctrl+click /
   * Shift+click) — syncs the editor selection, including multi-select.
   */
  onSelectionChange?: (ids: string[]) => void;
  /** Called when clicking empty space in the panel — clears the selection. */
  onClearSelection?: () => void;
  /**
   * Top-level layers on the editor clipboard; 0/undefined when empty. The
   * context menu uses it to gate Paste here and Paste to replace, exactly like
   * the canvas menu does.
   */
  clipboardCount?: number;
}

// ─── Drop indicator types ─────────────────────────────────────────────────────

interface DragOverState {
  targetId: string;
  instruction: LayerDragInstruction;
}

// ─── Selection helpers ────────────────────────────────────────────────────────

/** Stable key for a selection set — lets us spot changes without array identity. */
function selectionKeyOf(ids: Iterable<string>): string {
  return [...ids].sort().join("\u0000");
}

/** Parse Figma-style selection modifiers off the real mouse event. */
function selectionModeFromEvent(e: {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): LayerSelectionMode {
  const additive = e.metaKey || e.ctrlKey;
  return { additive, range: e.shiftKey && !additive };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LayerPanel({
  layers,
  setLayers,
  elementProperties = {},
  onAdd,
  onReorder,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onToggleCollapse,
  onContextAction,
  onSelectionChange,
  onClearSelection,
  clipboardCount = 0,
}: LayerPanelProps) {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<DragOverState | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    layerId: string;
  } | null>(null);

  // Build children lookup for group nesting (memoized so the F2-rename effect's
  // layerById dep stays stable across renders)
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, string[]>();
    for (const layer of layers) {
      const parentKey = layer.parentId ?? null;
      if (!map.has(parentKey)) map.set(parentKey, []);
      map.get(parentKey)!.push(layer.id);
    }
    return map;
  }, [layers]);
  const layerById = useMemo(
    () => new Map(layers.map((l) => [l.id, l])),
    [layers],
  );

  const isSelected = useCallback(
    (id: string) => layerById.get(id)?.active === true,
    [layerById],
  );

  // ── Selection state ───────────────────────────────────────────────────────
  // The layer `active` flag stays the source of truth (so canvas/keyboard
  // selection shows up in the panel); the panel only owns the anchor, which
  // shift-range selection needs.
  const selectedIds = useMemo(
    () => new Set(layers.filter((l) => l.active === true).map((l) => l.id)),
    [layers],
  );
  const selectionKey = useMemo(() => selectionKeyOf(selectedIds), [selectedIds]);
  const anchorRef = useRef<string | null>(null);
  /** Key of the selection this panel applied itself — the sync effect skips it. */
  const appliedSelectionRef = useRef<string | null>(null);
  /** Row kept in view as the selection changes. */
  const scrollTargetRef = useRef<string | null>(null);
  /** Selection key already scrolled to, so unrelated re-renders don't re-scroll. */
  const lastScrolledKeyRef = useRef<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const setRowRef = useCallback((id: string, el: HTMLLIElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  }, []);

  // ── Search filtering ─────────────────────────────────────────────────────
  // A query filters the tree to matching layers + their ancestors (so matches
  // remain visible in context) and forces matching subtrees to expand.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!normalizedQuery) return null;
    const matches = new Set<string>();
    // Collect matching layer ids
    for (const layer of layers) {
      if (layer.name.toLowerCase().includes(normalizedQuery)) {
        matches.add(layer.id);
      }
    }
    // Add ancestors of matches so nested results stay visible
    let grew = true;
    while (grew) {
      grew = false;
      for (const layer of layers) {
        if (matches.has(layer.id) && layer.parentId && !matches.has(layer.parentId)) {
          matches.add(layer.parentId);
          grew = true;
        }
      }
    }
    return matches;
  }, [layers, normalizedQuery]);

  /** True when a layer should be hidden by the active search query. */
  const isFilteredOut = useCallback(
    (id: string): boolean => searchMatches !== null && !searchMatches.has(id),
    [searchMatches],
  );

  /** During search, matching subtrees are always expanded. */
  const effectiveCollapsed = useCallback(
    (layer: LayerType): boolean => {
      if (searchMatches && searchMatches.has(layer.id)) return false;
      return layer.collapsed === true;
    },
    [searchMatches],
  );

  // ── Visible rows (shared by the selection math and the renderer) ──────────
  // Range selection must slice the rows the user can actually see, so this
  // mirrors the renderer exactly: collapsed subtrees and search misses drop out.
  const treeIndex = useMemo(() => buildLayerTreeIndex(layers), [layers]);
  /** Normalised parent per layer id; the drop resolver needs it to find siblings. */
  const parentById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const [parentId, ids] of treeIndex.byParent) {
      for (const id of ids) map.set(id, parentId);
    }
    for (const id of treeIndex.roots) map.set(id, null);
    return map;
  }, [treeIndex]);
  const rows = useMemo<LayerRow[]>(() => {
    const expanded = new Set(
      layers.filter((l) => !effectiveCollapsed(l)).map((l) => l.id),
    );
    return visibleLayerRows(treeIndex.roots, treeIndex.byParent, expanded).filter(
      (row) => !isFilteredOut(row.id),
    );
  }, [layers, treeIndex, effectiveCollapsed, isFilteredOut]);
  const visibleIds = useMemo(() => rows.map((row) => row.id), [rows]);

  // ── Virtualized window ───────────────────────────────────────────────────
  // Every row has the same height, so only the rows intersecting the viewport
  // (plus overscan) are mounted. The container keeps the full list height so the
  // scrollbar still reflects all rows.
  const rowVirtualizer = useRowVirtualizer({ count: rows.length });
  const { scrollRef, onScroll, totalHeight, startIndex, endIndex, scrollToIndex } =
    rowVirtualizer;
  const windowRows = rows.slice(startIndex, endIndex + 1);

  /**
   * Apply a resolved selection: move the anchor, highlight the rows and push the
   * ids to the editor so the canvas/right bar agree with the panel.
   */
  const applySelection = useCallback(
    (next: Set<string>, anchorId: string | null, targetId: string) => {
      appliedSelectionRef.current = selectionKeyOf(next);
      anchorRef.current = anchorId;
      scrollTargetRef.current = targetId;
      setLayers((prev) => {
        let changed = false;
        const updated = prev.map((l) => {
          const active = next.has(l.id);
          if ((l.active === true) === active) return l;
          changed = true;
          return { ...l, active };
        });
        return changed ? updated : prev;
      });
      onSelectionChange?.([...next]);
    },
    [setLayers, onSelectionChange],
  );

  /** Plain click = replace, Ctrl/Cmd+click = toggle, Shift+click = range. */
  const handleRowSelection = useCallback(
    (id: string, e: React.MouseEvent) => {
      const mode = selectionModeFromEvent(e);
      const next = layerSelectionForTarget(
        visibleIds,
        selectedIds,
        anchorRef.current,
        id,
        mode,
      );
      // The anchor only moves on a plain/additive click, never on a range click.
      const anchorId = mode.range && anchorRef.current ? anchorRef.current : id;
      applySelection(next, anchorId, id);
    },
    [visibleIds, selectedIds, applySelection],
  );


  // ── Build context menu items for a specific layer ─────────────────────────
  // Gating lives in `selectionCapabilities` + `layerCommands`; this stays a
  // passthrough that supplies the reactive document slice and the target's
  // Show/Hide + Lock/Unlock wording.
  const buildMenuItems = (layerId: string): ContextMenuItem[] => {
    const layer = layerById.get(layerId);
    if (!layer) return [];

    // One menu model for every surface: the canvas right-click hook builds its
    // entries from the same capability-gated registry, so the layer tab and the
    // canvas can never offer different commands for the same selection.
    return buildSelectionContextMenu({
      layers,
      elementProperties,
      anchorLayerId: layerId,
      // The panel only knows the *internal* clipboard; the OS clipboard can
      // also hold a payload, so Paste here follows the same availability rule
      // the keyboard path uses.
      hasClipboard: clipboardCount > 0 || isClipboardReadable(),
      clipboardCount,
    });
  };

  // ── Context menu handlers ────────────────────────────────────────────────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, layerId: string) => {
      e.preventDefault();
      e.stopPropagation();

      // If this layer is not already selected, select it (and move the anchor)
      if (!isSelected(layerId)) {
        applySelection(new Set([layerId]), layerId, layerId);
      }

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        layerId,
      });
    },
    [isSelected, applySelection],
  );

  const handleContextAction = useCallback(
    (actionId: string) => {
      if (contextMenu) {
        onContextAction?.(actionId, contextMenu.layerId);
      }
    },
    [contextMenu, onContextAction],
  );

  // ── Drag and drop handlers ──────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLayerId(id);
    e.dataTransfer.effectAllowed = "move";
    // Use a tiny transparent image as drag image for cleaner UX
    const dragImg = new window.Image();
    dragImg.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
    e.dataTransfer.setDragImage(dragImg, 0, 0);
  };

  /**
   * Resolve the drop instruction for the row under the pointer.
   *
   * The instruction comes from where the pointer sits inside the row (top /
   * middle / bottom third) plus whether the row is a container. The drop is
   * refused outright when the target is the dragged layer or sits inside its
   * own subtree, so a layer can never be moved into itself.
   */
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!canDropOnLayer(layers, draggedLayerId, targetId)) {
      e.dataTransfer.dropEffect = "none";
      setDragOver(null);
      return;
    }
    e.dataTransfer.dropEffect = "move";

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const target = layerById.get(targetId);
    const instruction = resolveDragInstruction({
      offsetY: e.clientY - rect.top,
      rowHeight: rect.height,
      targetIsContainer: target?.type === "group",
    });

    setDragOver((prev) =>
      prev?.targetId === targetId && prev.instruction.type === instruction.type
        ? prev
        : { targetId, instruction },
    );

    // Auto-expand a collapsed group while hovering its make-child zone, so the
    // drop destination is always reachable (Figma behaviour).
    if (
      instruction.type === "make-child" &&
      target?.type === "group" &&
      target.collapsed
    ) {
      setLayers((prev) =>
        prev.map((l) => (l.id === targetId ? { ...l, collapsed: false } : l)),
      );
      onToggleCollapse?.(targetId, false);
    }
  };

  const handleDrop = (e: React.DragEvent, dropId: string) => {
    e.preventDefault();

    const sourceId = draggedLayerId;
    const instruction =
      dragOver?.targetId === dropId ? dragOver.instruction : null;

    if (sourceId && instruction && canDropOnLayer(layers, sourceId, dropId)) {
      const target = resolveDropTarget({
        sourceId,
        targetId: dropId,
        instruction,
        parentById,
        childIdsByParent: treeIndex.byParent,
        rootIds: treeIndex.roots,
      });

      if (target) {
        setLayers((prev) => {
          const next = reorderChild(
            prev,
            sourceId,
            target.parentId,
            target.index,
          );
          if (next === prev) return prev;
          // Notify parent to persist new order
          onReorder?.(
            next.map((layer, index) => ({ id: layer.id, orderIndex: index })),
          );
          return next;
        });
      }
    }

    setDraggedLayerId(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDraggedLayerId(null);
    setDragOver(null);
  };

  // ── Action handlers ──────────────────────────────────────────────────────
  const toggleVisibility = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        onToggleVisibility?.(id, !l.visible);
        return { ...l, visible: !l.visible };
      }),
    );
  };

  const toggleLock = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        onToggleLock?.(id, !l.locked);
        return { ...l, locked: !l.locked };
      }),
    );
  };

  const handleAddLayer = () => {
    const newLayer: LayerType = {
      id: Date.now().toString(),
      name: "New Layer",
      type: "shape",
      locked: false,
      visible: true,
      active: true,
      parentId: null,
    };
    setLayers((prev) => {
      const activeIndex = prev.findIndex((l) => l.active);
      const insertIndex = activeIndex >= 0 ? activeIndex : 0;
      const newLayers = prev.map((l) => ({ ...l, active: false }) as LayerType);
      newLayers.splice(insertIndex, 0, newLayer);
      onAdd?.(newLayer, insertIndex);
      return newLayers;
    });
  };

  // ── Add empty group (Open Pencil style: creates a container on the canvas) ──
  const handleAddGroup = () => {
    const newGroup: LayerType = {
      id: `group-${Date.now()}`,
      name: "Group",
      type: "group",
      locked: false,
      visible: true,
      active: true,
      parentId: null,
      collapsed: false,
    };
    setLayers((prev) => {
      const activeIndex = prev.findIndex((l) => l.active);
      const insertIndex = activeIndex >= 0 ? activeIndex + 1 : prev.length;
      const newLayers = prev.map((l) => ({ ...l, active: false }) as LayerType);
      newLayers.splice(insertIndex, 0, newGroup);
      onAdd?.(newGroup, insertIndex);
      return newLayers;
    });
  };

  const handleDeleteLayer = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete?.(id);
    setLayers((prev) => prev.filter((l) => l.id !== id));
  };

  const startEditing = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setEditingLayerId(id);
    setEditingName(name);
  };

  const saveEditing = () => {
    if (editingLayerId) {
      const newName = editingName.trim() || "Untitled Layer";
      onRename?.(editingLayerId, newName);
      setLayers((prev) =>
        prev.map((l) =>
          l.id === editingLayerId ? { ...l, name: newName } : l,
        ),
      );
      setEditingLayerId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEditing();
    } else if (e.key === "Escape") {
      setEditingLayerId(null);
    }
  };

  // ── Listen for F2 rename keyboard shortcut ────────────────────────────────
  const layerByIdRef = useRef(layerById);
  useEffect(() => { layerByIdRef.current = layerById; }, [layerById]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { layerId: string };
      const layer = layerByIdRef.current.get(detail.layerId);
      if (layer) {
        setEditingLayerId(layer.id);
        setEditingName(layer.name);
      }
    };
    window.addEventListener("layer-rename-start", handler);
    return () => window.removeEventListener("layer-rename-start", handler);
  }, []);

  // ── External selection → panel sync ───────────────────────────────────────
  // A selection made elsewhere (canvas click, keyboard, rubber band) has to
  // reveal its rows: expand collapsed ancestors, then scroll the row into view.
  // Selections this panel applied itself are skipped so the two never ping-pong.
  useEffect(() => {
    if (selectedIds.size === 0) return;
    if (appliedSelectionRef.current === selectionKey) return;

    scrollTargetRef.current = [...selectedIds][0];

    const toExpand = new Set<string>();
    for (const id of selectedIds) {
      let parentId = layerById.get(id)?.parentId ?? null;
      while (parentId) {
        const parent = layerById.get(parentId);
        if (parent && effectiveCollapsed(parent)) toExpand.add(parentId);
        parentId = parent?.parentId ?? null;
      }
    }
    if (toExpand.size === 0) return;

    toExpand.forEach((id) => onToggleCollapse?.(id, false));
    setLayers((prev) => {
      let changed = false;
      const updated = prev.map((l) => {
        if (l.collapsed !== true || !toExpand.has(l.id)) return l;
        changed = true;
        return { ...l, collapsed: false };
      });
      return changed ? updated : prev;
    });
  }, [
    selectionKey,
    selectedIds,
    layerById,
    effectiveCollapsed,
    onToggleCollapse,
    setLayers,
  ]);

  // ── Keep the selected row in view ─────────────────────────────────────────
  // Depends on `rows` so it re-runs once an expansion has revealed the row, but
  // scrolls at most once per selection so expanding an unrelated group does not
  // yank the list back to the selection. `scrollToIndex` handles rows that are
  // outside the virtual window (they have no element to scroll to yet); the DOM
  // fallback covers an unmeasurable viewport / older browsers.
  useEffect(() => {
    const id = scrollTargetRef.current;
    if (!id || !visibleIds.includes(id)) return;
    if (lastScrolledKeyRef.current === selectionKey) return;
    lastScrolledKeyRef.current = selectionKey;

    const index = rows.findIndex((row) => row.id === id);
    if (index !== -1 && scrollToIndex(index, { align: "auto" })) return;

    const el = rowRefs.current.get(id);
    // jsdom (and very old browsers) do not implement scrollIntoView.
    if (!el || typeof el.scrollIntoView !== "function") return;
    el.scrollIntoView({ block: "nearest" });
  }, [selectionKey, visibleIds, rows, scrollToIndex]);

  // ── Drop indicator ──────────────────────────────────────────────────────
  /** Instruction for a row, or `null` when it is not the current drop target. */
  const instructionFor = (layerId: string): LayerDragInstruction | null =>
    dragOver?.targetId === layerId ? dragOver.instruction : null;

  /** Render tree indent connector lines (like file explorer tree guides). */
  function renderIndentLines(
    parentId: string | null,
    depth: number,
  ): React.ReactNode[] {
    if (depth <= 0) return [];
    // Walk up ancestors to determine which rows need a vertical connector
    const lines: React.ReactNode[] = [];
    let currentParentId = parentId;
    for (let d = depth - 1; d >= 0; d--) {
      if (!currentParentId) break;
      const parent = layerById.get(currentParentId);
      if (!parent) break;
      // Check if this parent has a next sibling (so the line continues)
      const grandparentId = parent.parentId ?? null;
      const siblings = childrenMap.get(grandparentId) ?? [];
      const parentIndex = siblings.indexOf(parent.id);
      const hasNextSibling = parentIndex >= 0 && parentIndex < siblings.length - 1;
      if (hasNextSibling) {
        lines.push(
          <div
            key={`line-${parent.id}-${d}`}
            className="absolute top-0 bottom-0 w-px bg-white/5 pointer-events-none"
            style={{ left: `${12 + d * 16 + 7}px` }}
          />,
        );
      }
      currentParentId = parent.parentId ?? null;
    }
    return lines;
  }

  /** Render one row of the flattened tree, positioned by the virtualizer. */
  function renderRow(row: LayerRow, windowIndex: number): React.ReactNode {
    const layer = layerById.get(row.id);
    if (!layer) return null;

    const depth = row.level - 1;
    const isGroup = layer.type === "group";
    const isCollapsed = effectiveCollapsed(layer);
    const hasChildren = row.hasChildren;
    const childCount = childrenMap.get(row.id)?.length ?? 0;
    const active = layer.active === true;

    return (
      <LayerItem
        key={row.id}
        layer={layer}
        depth={depth}
        top={(startIndex + windowIndex) * LAYER_TREE_ROW_HEIGHT}
        active={active}
        isDragged={draggedLayerId === layer.id}
        isGroup={isGroup}
        isCollapsed={isCollapsed}
        hasChildren={hasChildren}
        childCount={childCount}
        instruction={instructionFor(layer.id)}
        indentLines={renderIndentLines(layer.parentId ?? null, depth)}
        editingLayerId={editingLayerId}
        editingName={editingName}
        setEditingName={setEditingName}
        saveEditing={saveEditing}
        handleKeyDown={handleKeyDown}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onClick={handleRowSelection}
        rowRef={(el) => setRowRef(layer.id, el)}
        onContextMenu={handleContextMenu}
        onToggleCollapse={onToggleCollapse ?? (() => {})}
        setLayers={setLayers}
        onDeleteLayer={handleDeleteLayer}
        toggleLock={toggleLock}
        toggleVisibility={toggleVisibility}
        startEditing={startEditing}
      />
    );
  }

  return (
    <div className={chrome.root} data-tour="layers">
      <div className={chrome.header}>
        <div className={chrome.headerTitle}>
          <Stack className="w-3.5 h-3.5" />
          Layers
        </div>
        <div className={chrome.headerActions}>
          <button
            onClick={handleAddLayer}
            className={chrome.iconButton}
            title="Add Layer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddGroup}
            className={chrome.iconButtonAccent}
            title="Add Group"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search field */}
      <div className={chrome.searchSection}>
        <div className={chrome.searchWrapper}>
          <MagnifyingGlass className={chrome.searchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search layers…"
            className={chrome.searchInput}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={chrome.searchClear}
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        data-testid="layers-scroll"
        className={chrome.viewport}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            // A cleared selection has no anchor to range from.
            anchorRef.current = null;
            onClearSelection?.();
          }
        }}
      >
        {layers.filter((l) => (l.parentId ?? null) === null).length === 0 ? (
          <div className={chrome.empty}>
            <p className={chrome.emptyText}>
              No layers yet. Draw on the canvas or click + to add one.
            </p>
          </div>
        ) : (
          // The list container keeps the full (unwindowed) height so the
          // scrollbar matches the row count while only `windowRows` are mounted.
          <ul className={chrome.list} style={{ height: totalHeight }}>
            {windowRows.map(renderRow)}
          </ul>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          {/* Backdrop to catch clicks outside */}
          <div
            className="fixed inset-0 z-[99]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <LayerContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={buildMenuItems(contextMenu.layerId)}
            // Same dispatch shape as the canvas menu: the menu itself hands the
            // command id back, so there is no window-wide event to mis-route.
            onAction={handleContextAction}
          />
        </>
      )}
    </div>
  );
}

