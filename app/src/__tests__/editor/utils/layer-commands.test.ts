import { describe, expect, it, vi } from "vitest";
import {
  LAYER_COMMAND_DEFINITIONS,
  buildLayerCommands,
  runLayerCommand,
  type LayerCommandId,
} from "../../../lib/editor/commands/layerCommands";
import { formatShortcut } from "../../../lib/editor/commands/shortcuts";
import { computeSelectionCapabilities } from "../../../lib/editor/selectionCapabilities";
import type { LayerType } from "../../../context/EditorContext";
import type {
  ElementProperties,
  PathElementProperties,
  ShapeElementProperties,
  TextElementProperties,
} from "../../../components/editor-canvas/ElementsRenderer";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function layer(id: string, overrides?: Partial<LayerType>): LayerType {
  return {
    id,
    name: id,
    type: "shape",
    locked: false,
    visible: true,
    parentId: null,
    ...overrides,
  };
}

function group(id: string, overrides?: Partial<LayerType>): LayerType {
  return layer(id, { type: "group", collapsed: false, ...overrides });
}

const shapeProps = (): ShapeElementProperties => ({
  type: "shape",
  kind: "rect",
  x: 0,
  y: 0,
  width: 20,
  height: 20,
  fill: "#fff",
  stroke: "none",
  strokeWidth: 0,
  opacity: 1,
});

const pathProps =(): PathElementProperties => ({
  type: "path",
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  points: [
    [0, 0],
    [10, 0],
    [10, 10],
  ],
  stroke: "#000",
  strokeWidth: 1,
  fill: "none",
  opacity: 1,
  closed: false,
});

const textProps = (): TextElementProperties => ({
  type: "text",
  x: 0,
  y: 0,
  width: 40,
  height: 16,
  content: "Hello",
  fontFamily: "Inter",
  fontSize: 14,
  fontWeight: 400,
  color: "#fff",
  textAlign: "left",
  textAlignVertical: "top",
});

/**
 * Compute capabilities + commands the way LayerPanel does.
 *
 * Shortcuts are formatted for Windows so the assertions are platform-stable
 * (the panel picks the platform up from the browser at runtime).
 */
function commandsFor(
  layers: LayerType[],
  selectedLayerIds: string[],
  elementProperties: Record<string, ElementProperties> = {},
) {
  const capabilities = computeSelectionCapabilities({
    layers,
    selectedLayerIds,
    elementProperties,
  });
  return buildLayerCommands({ capabilities, platform: "windows" });
}

function enabledIds(commands: Record<LayerCommandId, { enabled: boolean }>): LayerCommandId[] {
  return (Object.keys(commands) as LayerCommandId[]).filter(
    (id) => commands[id].enabled,
  );
}

// ─── Registry shape ───────────────────────────────────────────────────────────

describe("layerCommands registry", () => {
  it("exposes every definition and defaults run to a no-op", () => {
    const commands = commandsFor([], []);
    expect(Object.keys(commands)).toHaveLength(LAYER_COMMAND_DEFINITIONS.length);
    for (const definition of LAYER_COMMAND_DEFINITIONS) {
      const command = commands[definition.id];
      expect(command.id).toBe(definition.id);
      expect(command.label).toBe(definition.label);
      expect(() => command.run()).not.toThrow();
    }
  });

  it("keeps the legacy command ids the menu and shortcuts dispatch on", () => {
    const commands = commandsFor([], []);
    const expected: LayerCommandId[] = [
      "duplicate",
      "delete",
      "bringToFront",
      "bringForward",
      "sendBackward",
      "sendToBack",
      "group",
      "ungroup",
      "wrapInFrame",
      "flatten",
      "booleanUnion",
      "booleanSubtract",
      "booleanIntersect",
      "booleanExclude",
      "outlineText",
      "outlineStroke",
      "toggleMask",
      "toggleVisibility",
      "toggleLock",
      "copyAsPng",
    ];
    expect(expected.every((id) => commands[id] !== undefined)).toBe(true);
  });
});

// ─── Enabled / disabled matrix ────────────────────────────────────────────────

describe("layerCommands enabled matrix", () => {
  it("disables every selection-dependent command with an empty selection", () => {
    const commands = commandsFor(
      [layer("a"), group("g", { collapsed: false })],
      [],
      { a: shapeProps() },
    );
    expect(enabledIds(commands)).toEqual([]);
  });

  it("enables the baseline commands for a single shape", () => {
    const commands = commandsFor([layer("a")], ["a"], { a: shapeProps() });
    expect(commands.duplicate.enabled).toBe(true);
    expect(commands.delete.enabled).toBe(true);
    expect(commands.bringForward.enabled).toBe(true);
    expect(commands.toggleVisibility.enabled).toBe(true);
    expect(commands.toggleLock.enabled).toBe(true);
    expect(commands.copyAsPng.enabled).toBe(true);
    // Single layer: no group, no boolean.
    expect(commands.group.enabled).toBe(false);
    expect(commands.booleanUnion.enabled).toBe(false);
    // A shape can be outlined, but a lone root shape cannot be a mask.
    expect(commands.outlineStroke.enabled).toBe(true);
    expect(commands.outlineText.enabled).toBe(false);
    expect(commands.toggleMask.enabled).toBe(false);
    // Clipboard/transform commands that need only a selection.
    expect(commands.copy.enabled).toBe(true);
    expect(commands.cut.enabled).toBe(true);
    expect(commands.addAutoLayout.enabled).toBe(true);
    expect(commands.createComponent.enabled).toBe(true);
    expect(commands.flipHorizontal.enabled).toBe(true);
    expect(commands.flipVertical.enabled).toBe(true);
    // Nothing on the clipboard yet → both paste commands stay off.
    expect(commands.pasteHere.enabled).toBe(false);
    expect(commands.pasteToReplace.enabled).toBe(false);
  });

  it("enables Paste here purely from clipboard content", () => {
    const emptyDoc = computeSelectionCapabilities({
      layers: [],
      selectedLayerIds: [],
      hasClipboard: true,
      clipboardCount: 1,
    });
    const commands = buildLayerCommands({ capabilities: emptyDoc });
    expect(commands.pasteHere.enabled).toBe(true);
    expect(commands.pasteToReplace.enabled).toBe(false);
    expect(commands.copy.enabled).toBe(false);
  });

  it("enables group + boolean for two same-parent shapes", () => {
    const commands = commandsFor([layer("a"), layer("b")], ["a", "b"], {
      a: shapeProps(),
      b: shapeProps(),
    });
    expect(commands.group.enabled).toBe(true);
    expect(commands.booleanUnion.enabled).toBe(true);
    expect(commands.booleanSubtract.enabled).toBe(true);
    expect(commands.wrapInFrame.enabled).toBe(true);
    expect(commands.outlineStroke.enabled).toBe(true);
    // No group in the selection, so ungroup/flatten stay off.
    expect(commands.ungroup.enabled).toBe(false);
    expect(commands.flatten.enabled).toBe(false);
  });

  it("refuses to group layers with different parents", () => {
    const commands = commandsFor(
      [group("g"), layer("a"), layer("b", { parentId: "g" })],
      ["a", "b"],
      { a: shapeProps(), b: shapeProps() },
    );
    expect(commands.group.enabled).toBe(false);
    expect(commands.booleanUnion.enabled).toBe(true);
    expect(commands.wrapInFrame.enabled).toBe(false);
  });

  it("enables ungroup + flatten when a group is selected", () => {
    const commands = commandsFor([group("g"), layer("c", { parentId: "g" })], ["g"]);
    expect(commands.ungroup.enabled).toBe(true);
    expect(commands.flatten.enabled).toBe(true);
    expect(commands.group.enabled).toBe(false);
  });

  it("gates Outline Text on a text property, not the layer type", () => {
    const commands = commandsFor([layer("t", { type: "text" })], ["t"], {
      t: textProps(),
    });
    expect(commands.outlineText.enabled).toBe(true);
    expect(commands.outlineStroke.enabled).toBe(false);
  });

  it("gates outline commands on the element properties being present", () => {
    const commands = commandsFor([layer("t", { type: "text" })], ["t"], {});
    expect(commands.outlineText.enabled).toBe(false);
    expect(commands.outlineStroke.enabled).toBe(false);
  });

  it("enables mask only for a shape/text inside a group", () => {
    const children = [group("g"), layer("child", { parentId: "g" }), layer("root")];
    const asChild = commandsFor(children, ["child"], { child: shapeProps() });
    expect(asChild.toggleMask.enabled).toBe(true);

    const asRoot = commandsFor(children, ["root"], { root: shapeProps() });
    expect(asRoot.toggleMask.enabled).toBe(false);
  });

  it("treats a path property as a boolean/outline source", () => {
    const commands = commandsFor([layer("p"), layer("q")], ["p", "q"], {
      p: pathProps(),
      q: pathProps(),
    });
    expect(commands.booleanIntersect.enabled).toBe(true);
    expect(commands.outlineStroke.enabled).toBe(true);
  });

  it("requires the layer to exist in the document, not just the id list", () => {
    const commands = commandsFor([layer("a")], ["ghost"], { ghost: shapeProps() });
    expect(commands.duplicate.enabled).toBe(false);
  });
});

// ─── Reference menu surface ───────────────────────────────────────────────────

/** The commands the reference context menu renders, top to bottom. */
const REFERENCE_COMMAND_ORDER: LayerCommandId[] = [
  "copy",
  "cut",
  "pasteHere",
  "pasteToReplace",
  "duplicate",
  "delete",
  "bringForward",
  "bringToFront",
  "sendBackward",
  "sendToBack",
  "group",
  "wrapInFrame",
  "addAutoLayout",
  "toggleMask",
  "flatten",
  "outlineText",
  "outlineStroke",
  "createComponent",
  "toggleVisibility",
  "toggleLock",
  "flipHorizontal",
  "flipVertical",
  "copyAsPng",
  "copyAsSvg",
];

describe("layerCommands reference surface", () => {
  it("defines every command the reference menu renders", () => {
    const commands = commandsFor([layer("a")], ["a"], { a: shapeProps() });
    for (const id of REFERENCE_COMMAND_ORDER) {
      expect(commands[id], `missing command: ${id}`).toBeDefined();
    }
  });

  it("labels each command the way the reference menu does", () => {
    const commands = commandsFor([layer("a")], ["a"], { a: shapeProps() });
    const expected: Partial<Record<LayerCommandId, string>> = {
      copy: "Copy",
      cut: "Cut",
      pasteHere: "Paste here",
      pasteToReplace: "Paste to replace",
      duplicate: "Duplicate",
      delete: "Delete",
      bringForward: "Bring forward",
      bringToFront: "Bring to front",
      sendBackward: "Send backward",
      sendToBack: "Send to back",
      group: "Group selection",
      wrapInFrame: "Frame selection",
      addAutoLayout: "Add auto layout",
      toggleMask: "Use as mask",
      flatten: "Flatten",
      outlineText: "Outline text",
      outlineStroke: "Outline stroke",
      createComponent: "Create component",
      toggleVisibility: "Show/Hide",
      toggleLock: "Lock/Unlock",
      flipHorizontal: "Flip horizontal",
      flipVertical: "Flip vertical",
    };
    for (const [id, label] of Object.entries(expected)) {
      expect(commands[id as LayerCommandId].label).toBe(label);
    }
  });

  it("renders the reference shortcuts with Windows key names", () => {
    const commands = commandsFor([layer("a")], ["a"], { a: shapeProps() });
    const expected: Partial<Record<LayerCommandId, string>> = {
      copy: "Ctrl+C",
      cut: "Ctrl+X",
      pasteHere: "Ctrl+V",
      duplicate: "Ctrl+D",
      delete: "⌫",
      bringForward: "Ctrl+]",
      bringToFront: "]",
      sendBackward: "Ctrl+[",
      sendToBack: "[",
      group: "Ctrl+G",
      wrapInFrame: "Ctrl+Alt+G",
      addAutoLayout: "Shift+A",
      toggleMask: "Ctrl+Alt+M",
      flatten: "Alt+Shift+F",
      createComponent: "Ctrl+Alt+K",
      toggleVisibility: "Ctrl+Shift+H",
      toggleLock: "Ctrl+Shift+L",
      flipHorizontal: "Shift+H",
      flipVertical: "Shift+V",
    };
    for (const [id, shortcut] of Object.entries(expected)) {
      expect(commands[id as LayerCommandId].shortcut).toBe(shortcut);
    }
  });

  it("leaves Paste to replace and the outline commands shortcut-less", () => {
    const commands = commandsFor([layer("a")], ["a"], { a: shapeProps() });
    expect(commands.pasteToReplace.shortcut).toBeUndefined();
    expect(commands.outlineText.shortcut).toBeUndefined();
    expect(commands.outlineStroke.shortcut).toBeUndefined();
  });
});

// ─── Shortcut formatting ───────────────────────────────────────────────

describe("formatShortcut", () => {
  it("spells modifiers out on Windows and Linux", () => {
    expect(formatShortcut("Mod+C", "windows")).toBe("Ctrl+C");
    expect(formatShortcut("Mod+Alt+G", "windows")).toBe("Ctrl+Alt+G");
    expect(formatShortcut("Alt+Shift+F", "windows")).toBe("Alt+Shift+F");
    expect(formatShortcut("Shift+A", "windows")).toBe("Shift+A");
    expect(formatShortcut("Mod+Shift+H", "linux")).toBe("Ctrl+Shift+H");
  });

  it("uses the macOS glyphs, gluing them to the key", () => {
    expect(formatShortcut("Mod+C", "mac")).toBe("⌘C");
    expect(formatShortcut("Mod+Alt+G", "mac")).toBe("⌘⌥G");
    expect(formatShortcut("Alt+Shift+F", "mac")).toBe("⌥⇧F");
    expect(formatShortcut("Shift+H", "mac")).toBe("⇧H");
  });

  it("passes bare keys through and maps Backspace to the glyph", () => {
    expect(formatShortcut("]", "windows")).toBe("]");
    expect(formatShortcut("[", "mac")).toBe("[");
    expect(formatShortcut("Backspace", "windows")).toBe("⌫");
    expect(formatShortcut("Backspace", "mac")).toBe("⌫");
  });
});

// ─── Contextual labels ────────────────────────────────────────────────────────

describe("layerCommands contextual labels", () => {
  it("keeps the neutral labels when no target context is supplied", () => {
    const commands = commandsFor([layer("a")], ["a"]);
    expect(commands.toggleVisibility.label).toBe("Show/Hide");
    expect(commands.toggleLock.label).toBe("Lock/Unlock");
    expect(commands.toggleMask.label).toBe("Use as mask");
  });

  it("keeps the combined Show/Hide and Lock/Unlock labels in every state", () => {
    const capabilities = computeSelectionCapabilities({
      layers: [layer("a")],
      selectedLayerIds: ["a"],
    });

    // The reference menu always reads "Show/Hide" / "Lock/Unlock" — the row
    // toggles, so the wording never flips to a single verb.
    const commands = buildLayerCommands({
      capabilities,
      context: { targetMasked: false },
    });
    expect(commands.toggleVisibility.label).toBe("Show/Hide");
    expect(commands.toggleLock.label).toBe("Lock/Unlock");
  });

  it("words the mask command from the target mask state", () => {
    const capabilities = computeSelectionCapabilities({
      layers: [group("g"), layer("child", { parentId: "g" })],
      selectedLayerIds: ["child"],
      elementProperties: { child: shapeProps() },
    });
    const unmasked = buildLayerCommands({
      capabilities,
      context: { targetMasked: false },
    });
    const masked = buildLayerCommands({
      capabilities,
      context: { targetMasked: true },
    });
    expect(unmasked.toggleMask.label).toBe("Use as mask");
    expect(masked.toggleMask.label).toBe("Remove mask");
  });
});

// ─── runLayerCommand ──────────────────────────────────────────────────────────

describe("runLayerCommand", () => {
  it("runs an enabled command and reports true", () => {
    const capabilities = computeSelectionCapabilities({
      layers: [layer("a")],
      selectedLayerIds: ["a"],
    });
    const run = vi.fn();
    const commands = buildLayerCommands({
      capabilities,
      handlers: { duplicate: run },
    });

    expect(runLayerCommand(commands, "duplicate")).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("refuses to run a disabled command", () => {
    const capabilities = computeSelectionCapabilities({
      layers: [layer("a"), layer("b")],
      selectedLayerIds: ["a", "b"],
    });
    const run = vi.fn();
    const commands = buildLayerCommands({
      capabilities,
      handlers: { ungroup: run },
    });

    expect(runLayerCommand(commands, "ungroup")).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it("refuses to run an unknown command id", () => {
    const commands = commandsFor([layer("a")], ["a"]);
    expect(runLayerCommand(commands, "not-a-command" as LayerCommandId)).toBe(false);
  });
});
