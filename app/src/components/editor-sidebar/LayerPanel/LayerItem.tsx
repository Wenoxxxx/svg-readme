import {
  Eye,
  Lock,
  EyeSlash,
  LockOpen,
  DotsSixVertical,
  Trash,
  CaretRight,
  CaretDown,
  FolderOpen,
} from "@phosphor-icons/react";
import type { LayerType } from "../../../context/EditorContext";
import type { LayerDragInstruction } from "../../../lib/editor/layerTree/types";

import { LayerIcon } from "./LayerIcon";
import { LAYER_TREE_ROW_HEIGHT } from "./geometry";
import { layerTreeClasses, type LayerTreeDropPosition } from "./theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LayerItemProps {
  layer: LayerType;
  depth: number;
  /** Virtual offset in pixels from the top of the list container. */
  top: number;
  active: boolean;
  isDragged: boolean;
  isGroup: boolean;
  isCollapsed: boolean;
  hasChildren: boolean;
  childCount: number;
  /**
   * Drop instruction resolved for this row while a drag is over it, or `null`
   * when the row is not the current drop target.
   */
  instruction: LayerDragInstruction | null;
  indentLines: React.ReactNode[];
  editingLayerId: string | null;
  editingName: string;
  setEditingName: (name: string) => void;
  saveEditing: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onClick: (id: string, e: React.MouseEvent) => void;
  /** Ref to the row element, used to scroll a selected row into view. */
  rowRef?: React.Ref<HTMLLIElement>;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onToggleCollapse: (id: string, collapsed: boolean) => void;
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  onDeleteLayer: (e: React.MouseEvent, id: string) => void;
  toggleLock: (e: React.MouseEvent, id: string) => void;
  toggleVisibility: (e: React.MouseEvent, id: string) => void;
  startEditing: (e: React.MouseEvent, id: string, name: string) => void;
}

/** Translate a drop instruction into the theme's drop-position variant. */
function dropPositionOf(
  instruction: LayerDragInstruction | null,
): LayerTreeDropPosition | null {
  if (!instruction) return null;
  if (instruction.type === "reorder-above") return "above";
  if (instruction.type === "reorder-below") return "below";
  return "child";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LayerItem({
  layer,
  depth,
  top,
  active,
  isDragged,
  isGroup,
  isCollapsed,
  hasChildren,
  childCount,
  instruction,
  indentLines,
  editingLayerId,
  editingName,
  setEditingName,
  saveEditing,
  handleKeyDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClick,
  rowRef,
  onContextMenu,
  onToggleCollapse,
  setLayers,
  onDeleteLayer,
  toggleLock,
  toggleVisibility,
  startEditing,
}: LayerItemProps) {
  // Every class this row renders comes from the centralised theme; this
  // component only decides *which* variants apply.
  const classes = layerTreeClasses({
    selected: active,
    dragging: isDragged,
    hidden: !layer.visible,
    masked: layer.masked === true,
    childDropTarget: instruction?.type === "make-child",
    hasChildren,
    locked: layer.locked,
    visible: layer.visible,
    // Actions stay mounted but hidden until hover, except for the selected row
    // and any row whose lock/visibility state is non-default — that state must
    // stay visible without a hover.
    actionsVisible: active || layer.locked || !layer.visible,
    dropPosition: dropPositionOf(instruction),
  });

  return (
    <li
      key={layer.id}
      ref={rowRef}
      // Rows are absolutely positioned inside the virtualizer's list container,
      // and every row (including the inline rename input) is exactly one
      // `LAYER_TREE_ROW_HEIGHT` tall so the scroll offsets stay in sync.
      data-row-top={top}
      // Row-shell state, mirroring upstream `LayerTreeRowShell.vue`, so tests and
      // styling can target a row's state without reaching into its children.
      data-selected={active ? "true" : "false"}
      data-dragging={isDragged ? "true" : "false"}
      data-hidden={layer.visible ? "false" : "true"}
      data-drop-position={dropPositionOf(instruction) ?? "none"}
      data-drop-instruction={instruction?.type}
      draggable
      onDragStart={(e) => onDragStart(e, layer.id)}
      onDragOver={(e) => onDragOver(e, layer.id)}
      onDrop={(e) => onDrop(e, layer.id)}
      onDragEnd={onDragEnd}
      onClick={(e) => onClick(layer.id, e)}
      onContextMenu={(e) => onContextMenu(e, layer.id)}
      className={classes.row}
      style={{
        top: 0,
        height: LAYER_TREE_ROW_HEIGHT,
        transform: `translateY(${top}px)`,
        paddingLeft: `${12 + depth * 16}px`,
      }}
    >
      {indentLines}
      {instruction && instruction.type !== "make-child" && (
        <div className={classes.dropIndicator} />
      )}

      <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
        <div className={classes.dragHandle}>
          <DotsSixVertical className="w-3 h-3" />
        </div>

        {isGroup && hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newCollapsed = !isCollapsed;
              onToggleCollapse(layer.id, newCollapsed);
              setLayers((prev) => prev.map((l) => l.id === layer.id ? { ...l, collapsed: newCollapsed } : l));
            }}
            className={classes.disclosure}
          >
            {isCollapsed ? <CaretRight className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
          </button>
        ) : isGroup ? (
          // Folder glyph for a group with no children (empty) or a group whose
          // disclosure caret is on its own branch above.
          <div className={classes.disclosurePlaceholder}>
            <FolderOpen className={classes.folderIcon} />
          </div>
        ) : (
          <div className={classes.iconSlot}>
            <LayerIcon type={layer.type} className="w-3 h-3" />
          </div>
        )}

        {editingLayerId === layer.id ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={saveEditing}
            onKeyDown={handleKeyDown}
            autoFocus
            className={classes.renameInput}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={classes.label}
            onDoubleClick={(e) => startEditing(e, layer.id, layer.name)}
          >
            {layer.name}
          </span>
        )}

        {isGroup && (
          <span
            className={classes.childBadge}
            title={hasChildren ? `${childCount} child${childCount !== 1 ? "ren" : ""}` : "Empty group — drag layers here"}
          >
            {hasChildren ? childCount : "0"}
          </span>
        )}
      </div>

      <div className={classes.actions}>
        {layer.masked && (
          <span className={classes.maskedBadge} title="Masked">M</span>
        )}
        <button
          onClick={(e) => onDeleteLayer(e, layer.id)}
          className={classes.deleteButton}
          title="Delete Layer"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => toggleLock(e, layer.id)}
          className={classes.actionButton}
          title={layer.locked ? "Unlock Layer" : "Lock Layer"}
        >
          {layer.locked ? (
            <Lock className={classes.lockIcon} />
          ) : (
            <LockOpen className={classes.lockIcon} />
          )}
        </button>
        <button
          onClick={(e) => toggleVisibility(e, layer.id)}
          className={classes.actionButton}
          title={layer.visible ? "Hide Layer" : "Show Layer"}
        >
          {layer.visible ? (
            <Eye className={classes.visibilityIcon} />
          ) : (
            <EyeSlash className={classes.visibilityIcon} />
          )}
        </button>
      </div>
    </li>
  );
}
