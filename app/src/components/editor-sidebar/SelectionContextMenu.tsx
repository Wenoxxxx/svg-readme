import { useMemo } from "react";
import LayerContextMenu from "./LayerContextMenu";
import { buildSelectionContextMenu } from "./contextMenuItems";
import { useEditor } from "../../context/EditorContext";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SelectionContextMenuProps {
  /** Viewport position the menu should open at (clientX/clientY from the event). */
  x: number;
  y: number;
  /**
   * Layer the pointer targeted. For a multi-selection this only selects the
   * Show/Hide + Lock/Unlock wording — the commands themselves still run against
   * the whole selection, exactly like the layer tab's menu.
   */
  anchorLayerId?: string | null;
  onClose: () => void;
  /** Receives the command id (`duplicate`, `booleanUnion`, …). */
  onAction: (actionId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Canvas-side selection context menu.
 *
 * Renders the same capability-gated command set as the layer tab's row menu
 * (`buildSelectionContextMenu`), so right-clicking artwork exposes Group /
 * Boolean / Outline / mask / order / lock options without duplicating the menu
 * model. The click is handled directly instead of via the window
 * `layer-context-action` event so only one menu owns an open gesture.
 */
export default function SelectionContextMenu({
  x,
  y,
  anchorLayerId = null,
  onClose,
  onAction,
}: SelectionContextMenuProps) {
  const { layers, elementProperties } = useEditor();

  const items = useMemo(
    () => buildSelectionContextMenu({ layers, elementProperties, anchorLayerId }),
    [layers, elementProperties, anchorLayerId],
  );

  // Nothing selected → no menu (the caller normally prevents this).
  if (items.length === 0) return null;

  return (
    <>
      {/* Backdrop: swallows the click that dismisses the menu. */}
      <div
        className="fixed inset-0 z-[99]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <LayerContextMenu x={x} y={y} onClose={onClose} items={items} onAction={onAction} />
    </>
  );
}
