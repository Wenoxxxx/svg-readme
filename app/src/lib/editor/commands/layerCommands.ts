import type { SelectionCapabilities } from "../selectionCapabilities";

/**
 * The command ids the layer panel/menu/shortcuts share.
 *
 * These deliberately match the old ad-hoc string ids (`duplicate`,
 * `bringToFront`, `group`, `booleanUnion`, …) so the context-menu dispatch and
 * `useKeyboardShortcuts` keep working without a translation layer.
 */
export type LayerCommandId =
  | "duplicate"
  | "delete"
  | "bringToFront"
  | "bringForward"
  | "sendBackward"
  | "sendToBack"
  | "group"
  | "ungroup"
  | "wrapInFrame"
  | "flatten"
  | "booleanUnion"
  | "booleanSubtract"
  | "booleanIntersect"
  | "booleanExclude"
  | "outlineText"
  | "outlineStroke"
  | "toggleMask"
  | "toggleVisibility"
  | "toggleLock"
  | "copyAsPng";

/**
 * A layer command: the OpenPencil `{ id, label, enabled, run }` contract.
 *
 * `enabled` is derived from `SelectionCapabilities`, never from an ad-hoc check,
 * so every surface (menu, shortcut, button) agrees on what is allowed.
 */
export interface LayerCommand {
  id: LayerCommandId;
  label: string;
  shortcut?: string;
  enabled: boolean;
  run: () => void;
}

/** Handlers keyed by command id; missing ids fall back to a no-op. */
export type LayerCommandHandlers = Partial<Record<LayerCommandId, () => void>>;

/**
 * The state a command labels itself from when the wording depends on the
 * *target* layer rather than the selection (Show vs Hide, Lock vs Unlock).
 *
 * Optional: when omitted, commands fall back to their neutral label and the
 * menu renders it verbatim.
 */
export interface LayerCommandContext {
  /** The target layer is currently visible → the command reads "Hide". */
  targetVisible?: boolean;
  /** The target layer is currently locked → the command reads "Unlock". */
  targetLocked?: boolean;
  /** The target layer is currently a mask → the command reads "Remove Mask". */
  targetMasked?: boolean;
}

export interface LayerCommandDefinition {
  id: LayerCommandId;
  /** Neutral label, used when no `LayerCommandContext` is supplied. */
  label: string;
  shortcut?: string;
  enabled: (capabilities: SelectionCapabilities) => boolean;
  /** Contextual wording, e.g. Show/Hide → "Hide" for a visible target. */
  dynamicLabel?: (context: LayerCommandContext) => string;
}

/**
 * The registry's static half: identity, label, shortcut and the capability that
 * gates it. Ordering here is the canonical command order.
 */
export const LAYER_COMMAND_DEFINITIONS: readonly LayerCommandDefinition[] = [
  { id: "duplicate", label: "Duplicate", shortcut: "\u2318D", enabled: (c) => c.canDuplicate },
  { id: "delete", label: "Delete", shortcut: "\u232B", enabled: (c) => c.canDelete },
  {
    id: "bringToFront",
    label: "Bring to Front",
    shortcut: "\u2318\u21E7]",
    enabled: (c) => c.canReorder,
  },
  {
    id: "bringForward",
    label: "Bring Forward",
    shortcut: "\u2318]",
    enabled: (c) => c.canReorder,
  },
  {
    id: "sendBackward",
    label: "Send Backward",
    shortcut: "\u2318[",
    enabled: (c) => c.canReorder,
  },
  {
    id: "sendToBack",
    label: "Send to Back",
    shortcut: "\u2318\u21E7[",
    enabled: (c) => c.canReorder,
  },
  { id: "group", label: "Group Selection", shortcut: "\u2318G", enabled: (c) => c.canGroup },
  { id: "ungroup", label: "Ungroup", shortcut: "\u2318\u21E7G", enabled: (c) => c.canUngroup },
  { id: "wrapInFrame", label: "Frame Selection", enabled: (c) => c.canWrapInFrame },
  { id: "flatten", label: "Flatten", enabled: (c) => c.canFlatten },
  { id: "booleanUnion", label: "Union", enabled: (c) => c.canBoolean },
  { id: "booleanSubtract", label: "Subtract", enabled: (c) => c.canBoolean },
  { id: "booleanIntersect", label: "Intersect", enabled: (c) => c.canBoolean },
  { id: "booleanExclude", label: "Exclude", enabled: (c) => c.canBoolean },
  { id: "outlineText", label: "Outline Text", enabled: (c) => c.canOutlineText },
  { id: "outlineStroke", label: "Outline Stroke", enabled: (c) => c.canOutlineStroke },
  {
    id: "toggleMask",
    label: "Use as Mask",
    enabled: (c) => c.canMask,
    dynamicLabel: (context) =>
      context.targetMasked ? "Remove Mask" : "Use as Mask",
  },
  {
    id: "toggleVisibility",
    label: "Show/Hide",
    enabled: (c) => c.canToggleVisibility,
    dynamicLabel: (context) => (context.targetVisible ? "Hide" : "Show"),
  },
  {
    id: "toggleLock",
    label: "Lock/Unlock",
    enabled: (c) => c.canToggleLock,
    dynamicLabel: (context) => (context.targetLocked ? "Unlock" : "Lock"),
  },
  { id: "copyAsPng", label: "Copy as PNG", enabled: (c) => c.canCopyAsPng },
];

export interface BuildLayerCommandsInput {
  capabilities: SelectionCapabilities;
  handlers?: LayerCommandHandlers;
  /** Target-layer state for commands with contextual wording. */
  context?: LayerCommandContext;
}

/**
 * Build the full command registry for a selection.
 *
 * Pure: capabilities and handlers are injected, so the enabled/disabled matrix
 * is unit-testable without mounting the panel or the editor.
 */
export function buildLayerCommands({
  capabilities,
  handlers = {},
  context,
}: BuildLayerCommandsInput): Record<LayerCommandId, LayerCommand> {
  const commands = {} as Record<LayerCommandId, LayerCommand>;
  for (const definition of LAYER_COMMAND_DEFINITIONS) {
    const label =
      context && definition.dynamicLabel
        ? definition.dynamicLabel(context)
        : definition.label;
    commands[definition.id] = {
      id: definition.id,
      label,
      ...(definition.shortcut ? { shortcut: definition.shortcut } : {}),
      enabled: definition.enabled(capabilities),
      run: handlers[definition.id] ?? (() => {}),
    };
  }
  return commands;
}

/**
 * Run a command only when the capabilities allow it.
 *
 * Returns whether the command ran, which is what the context-menu dispatcher
 * and the shortcut layer report back.
 */
export function runLayerCommand(
  commands: Record<LayerCommandId, LayerCommand>,
  id: LayerCommandId,
): boolean {
  const command = commands[id];
  if (!command || !command.enabled) return false;
  command.run();
  return true;
}
