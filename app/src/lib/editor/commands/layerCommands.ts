import type { SelectionCapabilities } from "../selectionCapabilities";
import {
  currentPlatform,
  formatShortcut,
  type ShortcutPlatform,
} from "./shortcuts";

/**
 * The command ids the layer panel/menu/shortcuts share.
 *
 * The leading block is exactly what the reference context menu renders, in the
 * reference's top-to-bottom order. `ungroup` and the boolean ops are kept below
 * it: they are real, working commands that other surfaces and tests still
 * dispatch, they simply are not part of the reference menu's layout.
 *
 * Ids deliberately keep the historical ad-hoc strings (`duplicate`,
 * `bringToFront`, `group`, `booleanUnion`, …) so the context-menu dispatch and
 * `useKeyboardShortcuts` need no translation layer.
 */
export type LayerCommandId =
  // ── Clipboard / edit ──────────────────────────────────────────────────────
  | "copy"
  | "cut"
  | "pasteHere"
  | "pasteToReplace"
  | "duplicate"
  | "delete"
  // ── Ordering ──────────────────────────────────────────────────────────────
  | "bringForward"
  | "bringToFront"
  | "sendBackward"
  | "sendToBack"
  // ── Structure ─────────────────────────────────────────────────────────────
  | "group"
  | "wrapInFrame"
  | "addAutoLayout"
  | "toggleMask"
  | "flatten"
  | "outlineText"
  | "outlineStroke"
  // ── Component ─────────────────────────────────────────────────────────────
  | "createComponent"
  // ── State ─────────────────────────────────────────────────────────────────
  | "toggleVisibility"
  | "toggleLock"
  // ── Transform ─────────────────────────────────────────────────────────────
  | "flipHorizontal"
  | "flipVertical"
  // ── "Copy/Paste as" submenu ───────────────────────────────────────────────
  | "copyAsPng"
  | "copyAsSvg"
  // ── Not in the reference menu; still runnable ─────────────────────────────
  | "ungroup"
  | "booleanUnion"
  | "booleanSubtract"
  | "booleanIntersect"
  | "booleanExclude";

/**
 * A layer command: the OpenPencil `{ id, label, enabled, run }` contract.
 *
 * `enabled` is derived from `SelectionCapabilities`, never from an ad-hoc check,
 * so every surface (menu, shortcut, button) agrees on what is allowed.
 */
export interface LayerCommand {
  id: LayerCommandId;
  label: string;
  /** Display-ready shortcut (`Ctrl+Alt+G`, `⌘⌥G`) or undefined when unbound. */
  shortcut?: string;
  enabled: boolean;
  /**
   * Rendered with the accent (violet) treatment. The reference uses it for
   * Create component, the one command that is a "primary" action rather than a
   * plain edit.
   */
  accent?: boolean;
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
  /** The target layer is currently a mask → the command reads "Remove mask". */
  targetMasked?: boolean;
}

export interface LayerCommandDefinition {
  id: LayerCommandId;
  /** Neutral label, used when no `LayerCommandContext` is supplied. */
  label: string;
  /** Canonical binding (`"Mod+Alt+G"`), rendered per platform by `formatShortcut`. */
  shortcut?: string;
  accent?: boolean;
  enabled: (capabilities: SelectionCapabilities) => boolean;
  /** Contextual wording, e.g. Show/Hide → "Hide" for a visible target. */
  dynamicLabel?: (context: LayerCommandContext) => string;
}

/**
 * The registry's static half: identity, label, shortcut and the capability that
 * gates it. Ordering here is the canonical command order.
 */
export const LAYER_COMMAND_DEFINITIONS: readonly LayerCommandDefinition[] = [
  // ── Clipboard / edit ──────────────────────────────────────────────────────
  { id: "copy", label: "Copy", shortcut: "Mod+C", enabled: (c) => c.canCopy },
  { id: "cut", label: "Cut", shortcut: "Mod+X", enabled: (c) => c.canCut },
  {
    id: "pasteHere",
    label: "Paste here",
    shortcut: "Mod+V",
    enabled: (c) => c.canPasteHere,
  },
  {
    id: "pasteToReplace",
    label: "Paste to replace",
    enabled: (c) => c.canPasteToReplace,
  },
  {
    id: "duplicate",
    label: "Duplicate",
    shortcut: "Mod+D",
    enabled: (c) => c.canDuplicate,
  },
  {
    id: "delete",
    label: "Delete",
    shortcut: "Backspace",
    enabled: (c) => c.canDelete,
  },
  // ── Ordering ──────────────────────────────────────────────────────────────
  {
    id: "bringForward",
    label: "Bring forward",
    shortcut: "Mod+]",
    enabled: (c) => c.canReorder,
  },
  {
    id: "bringToFront",
    label: "Bring to front",
    shortcut: "]",
    enabled: (c) => c.canReorder,
  },
  {
    id: "sendBackward",
    label: "Send backward",
    shortcut: "Mod+[",
    enabled: (c) => c.canReorder,
  },
  {
    id: "sendToBack",
    label: "Send to back",
    shortcut: "[",
    enabled: (c) => c.canReorder,
  },
  // ── Structure ─────────────────────────────────────────────────────────────
  {
    id: "group",
    label: "Group selection",
    shortcut: "Mod+G",
    enabled: (c) => c.canGroup,
  },
  {
    id: "wrapInFrame",
    label: "Frame selection",
    shortcut: "Mod+Alt+G",
    enabled: (c) => c.canWrapInFrame,
  },
  {
    id: "addAutoLayout",
    label: "Add auto layout",
    shortcut: "Shift+A",
    enabled: (c) => c.canAddAutoLayout,
  },
  {
    id: "toggleMask",
    label: "Use as mask",
    shortcut: "Mod+Alt+M",
    enabled: (c) => c.canMask,
    dynamicLabel: (context) =>
      context.targetMasked ? "Remove mask" : "Use as mask",
  },
  {
    id: "flatten",
    label: "Flatten",
    shortcut: "Alt+Shift+F",
    enabled: (c) => c.canFlatten,
  },
  {
    id: "outlineText",
    label: "Outline text",
    enabled: (c) => c.canOutlineText,
  },
  {
    id: "outlineStroke",
    label: "Outline stroke",
    enabled: (c) => c.canOutlineStroke,
  },
  // ── Component ─────────────────────────────────────────────────────────────
  {
    id: "createComponent",
    label: "Create component",
    shortcut: "Mod+Alt+K",
    accent: true,
    enabled: (c) => c.canCreateComponent,
  },
  // ── State ─────────────────────────────────────────────────────────────────
  // Show/Hide and Lock/Unlock keep their combined label in every state — that
  // is how the reference menu reads, so there is no dynamic wording here.
  {
    id: "toggleVisibility",
    label: "Show/Hide",
    shortcut: "Mod+Shift+H",
    enabled: (c) => c.canToggleVisibility,
  },
  {
    id: "toggleLock",
    label: "Lock/Unlock",
    shortcut: "Mod+Shift+L",
    enabled: (c) => c.canToggleLock,
  },
  // ── Transform ─────────────────────────────────────────────────────────────
  {
    id: "flipHorizontal",
    label: "Flip horizontal",
    shortcut: "Shift+H",
    enabled: (c) => c.canFlip,
  },
  {
    id: "flipVertical",
    label: "Flip vertical",
    shortcut: "Shift+V",
    enabled: (c) => c.canFlip,
  },
  // ── Outside the reference menu ────────────────────────────────────────────
  {
    id: "ungroup",
    label: "Ungroup",
    shortcut: "Mod+Shift+G",
    enabled: (c) => c.canUngroup,
  },
  { id: "booleanUnion", label: "Union", enabled: (c) => c.canBoolean },
  { id: "booleanSubtract", label: "Subtract", enabled: (c) => c.canBoolean },
  { id: "booleanIntersect", label: "Intersect", enabled: (c) => c.canBoolean },
  { id: "booleanExclude", label: "Exclude", enabled: (c) => c.canBoolean },
  { id: "copyAsPng", label: "Copy as PNG", enabled: (c) => c.canCopyAsPng },
  { id: "copyAsSvg", label: "Copy as SVG", enabled: (c) => c.canCopyAsPng },
];

/**
 * The keyboard bindings the key handler matches on.
 *
 * Derived from the definitions above rather than written out again: the label a
 * menu row shows and the key that runs it are then the same string by
 * construction, so the two can never disagree.
 */
export interface LayerShortcutBinding {
  /** Canonical binding, as stored on the definition (`"Mod+Alt+G"`). */
  binding: string;
  command: LayerCommandId;
}

export const LAYER_SHORTCUT_BINDINGS: readonly LayerShortcutBinding[] =
  LAYER_COMMAND_DEFINITIONS.flatMap((definition) =>
    definition.shortcut
      ? [{ binding: definition.shortcut, command: definition.id }]
      : [],
  );

export interface BuildLayerCommandsInput {
  capabilities: SelectionCapabilities;
  handlers?: LayerCommandHandlers;
  /** Target-layer state for commands with contextual wording. */
  context?: LayerCommandContext;
  /** Platform used to render shortcut labels; defaults to the running one. */
  platform?: ShortcutPlatform;
}

/**
 * Build the full command registry for a selection.
 *
 * Pure: capabilities, handlers and the platform are injected, so the
 * enabled/disabled matrix and the rendered shortcuts are unit-testable without
 * mounting the panel or the editor.
 */
export function buildLayerCommands({
  capabilities,
  handlers = {},
  context,
  platform = currentPlatform(),
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
      ...(definition.shortcut
        ? { shortcut: formatShortcut(definition.shortcut, platform) }
        : {}),
      ...(definition.accent ? { accent: true } : {}),
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
