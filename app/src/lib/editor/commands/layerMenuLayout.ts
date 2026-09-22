import type { LayerCommand, LayerCommandId } from "./layerCommands";

/**
 * The layer context menu's *structure*, separated from its rendering.
 *
 * Both surfaces that open the menu — the layer panel rows and the canvas — go
 * through this one layout, so the two can never drift apart. Labels, shortcuts
 * and enabled state are not repeated here; they are read off the command
 * registry, which is the single source of truth for all of them.
 *
 * The layout reproduces the reference menu exactly: the same commands in the
 * same order, with separators dividing the six groups and a "Copy/Paste as"
 * submenu closing the menu.
 *
 * `ungroup` and the boolean ops are intentionally absent: they are real commands
 * but they are not part of the reference menu.
 */

export type LayerMenuEntry =
  | { type: "command"; id: LayerCommandId }
  | { type: "separator" }
  | {
      type: "submenu";
      id: string;
      label: string;
      children: readonly LayerCommandId[];
    };

export const LAYER_MENU_LAYOUT: readonly LayerMenuEntry[] = [
  // ── Clipboard / edit ──────────────────────────────────────────────────────
  { type: "command", id: "copy" },
  { type: "command", id: "cut" },
  { type: "command", id: "pasteHere" },
  { type: "command", id: "pasteToReplace" },
  { type: "command", id: "duplicate" },
  { type: "command", id: "delete" },
  { type: "separator" },
  // ── Ordering ──────────────────────────────────────────────────────────────
  { type: "command", id: "bringForward" },
  { type: "command", id: "bringToFront" },
  { type: "command", id: "sendBackward" },
  { type: "command", id: "sendToBack" },
  { type: "separator" },
  // ── Structure ─────────────────────────────────────────────────────────────
  { type: "command", id: "group" },
  { type: "command", id: "wrapInFrame" },
  { type: "command", id: "addAutoLayout" },
  { type: "command", id: "toggleMask" },
  { type: "command", id: "flatten" },
  { type: "command", id: "outlineText" },
  { type: "command", id: "outlineStroke" },
  { type: "separator" },
  // ── Component ─────────────────────────────────────────────────────────────
  { type: "command", id: "createComponent" },
  // ── State ─────────────────────────────────────────────────────────────────
  { type: "command", id: "toggleVisibility" },
  { type: "command", id: "toggleLock" },
  { type: "separator" },
  // ── Transform ─────────────────────────────────────────────────────────────
  { type: "command", id: "flipHorizontal" },
  { type: "command", id: "flipVertical" },
  { type: "separator" },
  // ── Copy/Paste as ─────────────────────────────────────────────────────────
  {
    type: "submenu",
    id: "copyPasteAs",
    label: "Copy/Paste as",
    children: ["copyAsPng", "copyAsSvg"],
  },
];

export interface LayerMenuCommand {
  kind: "command";
  id: LayerCommandId;
  label: string;
  shortcut?: string;
  enabled: boolean;
  accent: boolean;
}

export interface LayerMenuSeparator {
  kind: "separator";
}

export interface LayerMenuSubmenu {
  kind: "submenu";
  id: string;
  label: string;
  /** Enabled while any child is — the parent is only a pointer. */
  enabled: boolean;
  children: LayerMenuCommand[];
}

export type LayerMenuItem =
  | LayerMenuCommand
  | LayerMenuSeparator
  | LayerMenuSubmenu;

/** Resolve one registry command into its menu entry. */
function commandEntry(
  commands: Record<LayerCommandId, LayerCommand>,
  id: LayerCommandId,
): LayerMenuCommand {
  const command = commands[id];
  return {
    kind: "command",
    id,
    label: command?.label ?? id,
    ...(command?.shortcut ? { shortcut: command.shortcut } : {}),
    enabled: command?.enabled ?? false,
    accent: command?.accent === true,
  };
}

/**
 * Resolve the layout against a built command registry.
 *
 * Pure and total: an unknown or missing command degrades to a disabled entry
 * rather than throwing, so a partially-migrated registry can never blank out the
 * whole menu.
 */
export function buildLayerMenu(
  commands: Record<LayerCommandId, LayerCommand>,
): LayerMenuItem[] {
  return LAYER_MENU_LAYOUT.map((entry): LayerMenuItem => {
    if (entry.type === "separator") return { kind: "separator" };

    if (entry.type === "submenu") {
      const children = entry.children.map((id) => commandEntry(commands, id));
      return {
        kind: "submenu",
        id: entry.id,
        label: entry.label,
        enabled: children.some((child) => child.enabled),
        children,
      };
    }

    return commandEntry(commands, entry.id);
  });
}
