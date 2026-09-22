import {
  ScribbleLoop,
  StackSimple,
  TextT,
} from "@phosphor-icons/react";
import type {
  ContextMenuAction,
  ContextMenuItem,
} from "./LayerContextMenu";
import type { LayerCommandId } from "../../lib/editor/commands/layerCommands";
import { buildLayerCommands } from "../../lib/editor/commands/layerCommands";
import {
  buildLayerMenu,
  type LayerMenuCommand,
  type LayerMenuItem,
} from "../../lib/editor/commands/layerMenuLayout";
import type { ShortcutPlatform } from "../../lib/editor/commands/shortcuts";
import { computeSelectionCapabilities } from "../../lib/editor/selectionCapabilities";
import type { LayerType } from "../../context/EditorContext";
import type { ElementProperties } from "../editor-canvas/ElementsRenderer";

/**
 * Presentation for the layer context menu.
 *
 * The *structure* (order, grouping, separators, submenu) lives in the pure
 * `layerMenuLayout` module and the *copy* (labels, shortcuts, enabled state)
 * lives in the command registry. This module does the one thing neither can:
 * attach the handful of icons the reference menu shows.
 *
 * Only Flatten, Outline text and Outline stroke carry an icon in the reference;
 * every other row is text-only, so there is no reserved icon column and labels
 * are not indented to accommodate one.
 */
const MENU_ICONS: Partial<Record<LayerCommandId, React.ReactNode>> = {
  flatten: <StackSimple className="w-3.5 h-3.5" />,
  outlineText: <TextT className="w-3.5 h-3.5" />,
  outlineStroke: <ScribbleLoop className="w-3.5 h-3.5" />,
};

/** Attach the icon (and nothing else) to a resolved menu command. */
function toContextMenuItem(entry: LayerMenuCommand): ContextMenuAction {
  return {
    id: entry.id,
    label: entry.label,
    ...(MENU_ICONS[entry.id] ? { icon: MENU_ICONS[entry.id] } : {}),
    ...(entry.shortcut ? { shortcut: entry.shortcut } : {}),
    disabled: !entry.enabled,
    ...(entry.accent ? { accent: true } : {}),
  };
}

function toContextMenuItems(menu: LayerMenuItem[]): ContextMenuItem[] {
  return menu.map((entry): ContextMenuItem => {
    if (entry.kind === "separator") return { separator: true };
    if (entry.kind === "submenu") {
      return {
        id: entry.id,
        label: entry.label,
        disabled: !entry.enabled,
        children: entry.children.map(toContextMenuItem),
      };
    }
    return toContextMenuItem(entry);
  });
}

/**
 * Build the context menu for the *current selection*, whatever surface opened
 * it (layer panel row or canvas right-click).
 *
 * Mirrors OpenPencil's split between `menu-model/canvas` and the renderer: the
 * gating lives in `selectionCapabilities` + `layerCommands`, the layout in
 * `layerMenuLayout`, and both call sites go through here so the canvas menu can
 * never drift from the layer tab's.
 *
 * Returns an empty list when nothing is selected — callers use that to decide
 * whether a menu should open at all.
 *
 * @param anchorLayerId Layer the pointer targeted. When it is part of the
 *   selection it supplies the Show/Hide + Lock/Unlock wording; otherwise the
 *   first selected layer stands in (Figma keeps the multi-selection on
 *   right-click rather than collapsing it to the clicked layer).
 */
export function buildSelectionContextMenu(options: {
  layers: readonly LayerType[];
  elementProperties: Readonly<Record<string, ElementProperties>>;
  anchorLayerId?: string | null;
  /** Whether the editor clipboard holds layers (Paste here / Paste to replace). */
  hasClipboard?: boolean;
  /** How many top-level layers the clipboard holds. */
  clipboardCount?: number;
  /** Platform used for shortcut labels; defaults to the running one. */
  platform?: ShortcutPlatform;
}): ContextMenuItem[] {
  const {
    layers,
    elementProperties,
    anchorLayerId = null,
    hasClipboard,
    clipboardCount,
    platform,
  } = options;

  // `layer.active` is the panel's selection mirror and is kept in sync with
  // `selectedLayerIds` by EditorContext for every selection path.
  const selectedLayerIds = layers.filter((l) => l.active === true).map((l) => l.id);
  if (selectedLayerIds.length === 0) return [];

  const targetId =
    anchorLayerId && selectedLayerIds.includes(anchorLayerId)
      ? anchorLayerId
      : selectedLayerIds[0];
  const target = layers.find((l) => l.id === targetId);

  const commands = buildLayerCommands({
    capabilities: computeSelectionCapabilities({
      layers,
      selectedLayerIds,
      elementProperties,
      hasClipboard,
      clipboardCount,
    }),
    context: {
      targetMasked: target?.masked === true,
    },
    ...(platform ? { platform } : {}),
  });

  return toContextMenuItems(buildLayerMenu(commands));
}
