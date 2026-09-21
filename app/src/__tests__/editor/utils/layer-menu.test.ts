import { describe, expect, it } from "vitest";
import { buildLayerCommands } from "../../../lib/editor/commands/layerCommands";
import {
  buildLayerMenu,
  LAYER_MENU_LAYOUT,
} from "../../../lib/editor/commands/layerMenuLayout";
import { computeSelectionCapabilities } from "../../../lib/editor/selectionCapabilities";
import type { LayerType } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";

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

function shapeProps(): ElementProperties {
  return {
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
  };
}

function menuFor(
  layers: LayerType[],
  selectedLayerIds: string[],
  options: { elementProperties?: Record<string, ElementProperties>; hasClipboard?: boolean; clipboardCount?: number } = {},
) {
  const capabilities = computeSelectionCapabilities({
    layers,
    selectedLayerIds,
    elementProperties: options.elementProperties ?? {},
    hasClipboard: options.hasClipboard,
    clipboardCount: options.clipboardCount,
  });
  return buildLayerMenu(
    buildLayerCommands({ capabilities, platform: "windows" }),
  );
}

/** Compact projection: entry labels with separators as `---`. */
function outline(menu: ReturnType<typeof menuFor>): string[] {
  return menu.map((item) =>
    item.kind === "separator" ? "---" : item.label,
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

describe("layer menu layout", () => {
  it("renders the reference structure, in the reference order", () => {
    const menu = menuFor([layer("a")], ["a"], { elementProperties: { a: shapeProps() } });
    expect(outline(menu)).toEqual([
      "Copy",
      "Cut",
      "Paste here",
      "Paste to replace",
      "Duplicate",
      "Delete",
      "---",
      "Bring forward",
      "Bring to front",
      "Send backward",
      "Send to back",
      "---",
      "Group selection",
      "Frame selection",
      "Add auto layout",
      "Use as mask",
      "Flatten",
      "Outline text",
      "Outline stroke",
      "---",
      "Create component",
      "Show/Hide",
      "Lock/Unlock",
      "---",
      "Flip horizontal",
      "Flip vertical",
      "---",
      "Copy/Paste as",
    ]);
  });

  it("describes exactly those separators and the trailing submenu", () => {
    const separatorIndices = LAYER_MENU_LAYOUT.map((entry, index) =>
      entry.type === "separator" ? index : -1,
    ).filter((index) => index >= 0);
    expect(separatorIndices).toEqual([6, 11, 19, 23, 26]);

    const last = LAYER_MENU_LAYOUT.at(-1)!;
    expect(last.type).toBe("submenu");
  });

  it("never puts two separators next to each other or at the edges", () => {
    LAYER_MENU_LAYOUT.forEach((entry, index) => {
      if (entry.type !== "separator") return;
      expect(LAYER_MENU_LAYOUT[index - 1]?.type).not.toBe("separator");
      expect(LAYER_MENU_LAYOUT[index + 1]?.type).not.toBe("separator");
      expect(index).toBeGreaterThan(0);
      expect(index).toBeLessThan(LAYER_MENU_LAYOUT.length - 1);
    });
  });
});

// ─── Resolved entries ─────────────────────────────────────────────────────────

describe("layer menu entries", () => {
  it("carries the reference shortcut, enabled state and accent flag", () => {
    const menu = menuFor([layer("a")], ["a"], { elementProperties: { a: shapeProps() } });
    const command = (label: string) => {
      const entry = menu.find((item) => item.kind !== "separator" && item.label === label);
      if (!entry || entry.kind !== "command") throw new Error(`no command: ${label}`);
      return entry;
    };

    expect(command("Copy")).toMatchObject({ shortcut: "Ctrl+C", enabled: true, accent: false });
    expect(command("Delete")).toMatchObject({ shortcut: "⌫", enabled: true });
    // A single root layer cannot be grouped or masked.
    expect(command("Group selection")).toMatchObject({ enabled: false });
    expect(command("Use as mask")).toMatchObject({ enabled: false });
    // The reference styles Create component with the accent colour.
    expect(command("Create component")).toMatchObject({ accent: true, enabled: true });
    // No clipboard yet.
    expect(command("Paste here")).toMatchObject({ enabled: false });
  });

  it("mirrors the enabled state of the clipboard commands", () => {
    const menu = menuFor([layer("a")], ["a"], {
      elementProperties: { a: shapeProps() },
      hasClipboard: true,
      clipboardCount: 1,
    });
    const pasteHere = menu.find((item) => item.kind === "command" && item.label === "Paste here");
    const pasteReplace = menu.find((item) => item.kind === "command" && item.label === "Paste to replace");
    expect(pasteHere).toMatchObject({ enabled: true });
    expect(pasteReplace).toMatchObject({ enabled: true });
  });

  it("fills the Copy/Paste as submenu with the two copy commands", () => {
    const menu = menuFor([layer("a")], ["a"], { elementProperties: { a: shapeProps() } });
    const submenu = menu.at(-1)!;
    expect(submenu.kind).toBe("submenu");
    if (submenu.kind !== "submenu") return;
    expect(submenu.children.map((child) => child.label)).toEqual([
      "Copy as PNG",
      "Copy as SVG",
    ]);
    expect(submenu.children.every((child) => child.enabled)).toBe(true);
  });

  it("omits the submenu children when nothing is selected", () => {
    // The menu is only opened with a selection, but the model must stay total.
    const menu = menuFor([layer("a")], []);
    const submenu = menu.at(-1);
    expect(submenu?.kind).toBe("submenu");
    if (submenu?.kind !== "submenu") return;
    expect(submenu.children.every((child) => child.enabled === false)).toBe(true);
  });
});
