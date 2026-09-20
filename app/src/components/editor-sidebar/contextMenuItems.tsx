import {
  Copy,
  Trash,
  ArrowFatLineUp,
  ArrowFatLineDown,
  ArrowUp,
  ArrowDown,
  Stack,
  StackSimple,
  Eye,
  EyeSlash,
  Lock,
  LockOpen,
  List,
  FrameCorners,
  Clipboard,
} from "@phosphor-icons/react";
import type { ContextMenuItem } from "./LayerContextMenu";
import type {
  LayerCommand,
  LayerCommandId,
} from "../../lib/editor/commands/layerCommands";
import { buildLayerCommands } from "../../lib/editor/commands/layerCommands";
import { computeSelectionCapabilities } from "../../lib/editor/selectionCapabilities";
import type { LayerType } from "../../context/EditorContext";
import type { ElementProperties } from "../editor-canvas/ElementsRenderer";

/**
 * Presentation for the layer context menu.
 *
 * Labels, shortcuts and enabled state all come from the capability-gated
 * command registry (`layerCommands.ts`); this module only owns grouping, icons
 * and the target-dependent Show/Hide + Lock/Unlock wording — the OpenPencil
 * split between commands and `menu-model/canvas`.
 */
export function buildLayerContextMenu(options: {
  commands: Record<LayerCommandId, LayerCommand>;
  /** Target visibility — only selects the eye-eyeSlash icon; the label is the command's. */
  isVisible?: boolean;
  /** Target lock state — only selects the lock icon; the label is the command's. */
  isLocked?: boolean;
}): ContextMenuItem[] {
  const { commands, isVisible = true, isLocked = false } = options;

  const item = (
    id: LayerCommandId,
    overrides: Partial<{
      icon: React.ReactNode;
      disabled: boolean;
      destructive: boolean;
    }> = {},
  ): ContextMenuItem => {
    const command = commands[id];
    return {
      id,
      // Labels (including Show/Hide and Lock/Unlock) come from the registry so
      // every surface renders the same wording.
      label: command.label,
      icon: overrides.icon,
      ...(command.shortcut ? { shortcut: command.shortcut } : {}),
      disabled: overrides.disabled ?? !command.enabled,
      ...(overrides.destructive ? { destructive: true } : {}),
    };
  };

  const icon = (node: React.ReactNode) => (
    <span className="w-3.5 h-3.5">{node}</span>
  );

  const items: ContextMenuItem[] = [];

  // ── Group 1: Cut/Copy/Duplicate/Delete ──────────────────────────────────
  items.push(
    item("duplicate", { icon: icon(<Copy className="w-3.5 h-3.5" />) }),
    item("delete", {
      icon: icon(<Trash className="w-3.5 h-3.5" />),
      destructive: true,
    }),
  );

  items.push({ separator: true });

  // ── Group 2: Ordering ──────────────────────────────────────────────────
  items.push(
    item("bringToFront", { icon: icon(<ArrowFatLineUp className="w-3.5 h-3.5" />) }),
    item("bringForward", { icon: icon(<ArrowUp className="w-3.5 h-3.5" />) }),
    item("sendBackward", { icon: icon(<ArrowDown className="w-3.5 h-3.5" />) }),
    item("sendToBack", { icon: icon(<ArrowFatLineDown className="w-3.5 h-3.5" />) }),
  );

  items.push({ separator: true });

  // ── Group 3: Group/Ungroup/Frame/Flatten ────────────────────────────────
  items.push(
    item("group", { icon: icon(<Stack className="w-3.5 h-3.5" />) }),
    item("ungroup", { icon: icon(<StackSimple className="w-3.5 h-3.5" />) }),
    item("wrapInFrame", { icon: icon(<FrameCorners className="w-3.5 h-3.5" />) }),
    item("flatten", { icon: icon(<List className="w-3.5 h-3.5" />) }),
  );

  // ── Group 3b: Boolean submenu / masks / outlines ───────────────────────
  items.push({
    id: "boolean",
    label: "Boolean",
    icon: icon(<List className="w-3.5 h-3.5" />),
    disabled: !commands.booleanUnion.enabled,
    children: [
      item("booleanUnion") as import("./LayerContextMenu").ContextMenuAction,
      item("booleanSubtract") as import("./LayerContextMenu").ContextMenuAction,
      item("booleanIntersect") as import("./LayerContextMenu").ContextMenuAction,
      item("booleanExclude") as import("./LayerContextMenu").ContextMenuAction,
    ],
  });

  items.push(
    item("outlineText"),
    item("outlineStroke"),
    item("toggleMask", { icon: icon(<FrameCorners className="w-3.5 h-3.5" />) }),
  );

  items.push({ separator: true });

  // ── Group 4: Visibility / Lock ─────────────────────────────────────────
  items.push(
    item("toggleVisibility", {
      icon: icon(
        isVisible ? (
          <EyeSlash className="w-3.5 h-3.5" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        ),
      ),
    }),
    item("toggleLock", {
      icon: icon(
        isLocked ? (
          <LockOpen className="w-3.5 h-3.5" />
        ) : (
          <Lock className="w-3.5 h-3.5" />
        ),
      ),
    }),
  );

  items.push({ separator: true });

  items.push(item("copyAsPng", { icon: icon(<Clipboard className="w-3.5 h-3.5" />) }));

  return items;
}

/**
 * Build the context menu for the *current selection*, whatever surface opened
 * it (layer panel row or canvas right-click).
 *
 * Mirrors OpenPencil's split between `menu-model/canvas` and the renderer: the
 * gating lives in `selectionCapabilities` + `layerCommands`, this module owns
 * presentation, and both call sites go through here so the canvas menu can
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
}): ContextMenuItem[] {
  const { layers, elementProperties, anchorLayerId = null } = options;

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
    }),
    context: {
      targetVisible: target?.visible ?? true,
      targetLocked: target?.locked ?? false,
      targetMasked: target?.masked === true,
    },
  });

  return buildLayerContextMenu({
    commands,
    isVisible: target?.visible ?? true,
    isLocked: target?.locked ?? false,
  });
}
