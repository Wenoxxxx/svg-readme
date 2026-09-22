import { describe, expect, it } from "vitest";
import { buildSelectionContextMenu } from "../../../components/editor-sidebar/contextMenuItems";
import type {
  ContextMenuAction,
  ContextMenuItem,
  ContextMenuSeparator,
} from "../../../components/editor-sidebar/LayerContextMenu";
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
    active: false,
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

function isSeparator(item: ContextMenuItem): item is ContextMenuSeparator {
  return "separator" in item && item.separator === true;
}

function asAction(item: ContextMenuItem): ContextMenuAction {
  return item as ContextMenuAction;
}

function labels(items: ContextMenuItem[]): string[] {
  return items.map((item) => (isSeparator(item) ? "---" : asAction(item).label));
}

function byLabel(items: ContextMenuItem[], label: string): ContextMenuAction {
  const found = items.find((item) => !isSeparator(item) && asAction(item).label === label);
  if (!found) throw new Error(`no menu item labelled ${label}`);
  return asAction(found);
}

/** One selected shape — the simplest case the reference menu opens on. */
function singleSelectionMenu(items?: { hasClipboard?: boolean; clipboardCount?: number }) {
  return buildSelectionContextMenu({
    layers: [layer("a", { active: true })],
    elementProperties: { a: shapeProps() },
    anchorLayerId: "a",
    platform: "windows",
    hasClipboard: items?.hasClipboard,
    clipboardCount: items?.clipboardCount,
  });
}

// ─── Structure ────────────────────────────────────────────────────────────────

describe("buildSelectionContextMenu — structure", () => {
  it("returns nothing when no layer is selected", () => {
    expect(
      buildSelectionContextMenu({
        layers: [layer("a")],
        elementProperties: { a: shapeProps() },
      }),
    ).toEqual([]);
  });

  it("lays the items out exactly like the reference menu", () => {
    expect(labels(singleSelectionMenu())).toEqual([
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

  it("shows an icon on Flatten, Outline text and Outline stroke only", () => {
    const items = singleSelectionMenu();
    const withIcons = items
      .filter((item) => !isSeparator(item) && asAction(item).icon)
      .map((item) => asAction(item).label);

    expect(withIcons).toEqual(["Flatten", "Outline text", "Outline stroke"]);
  });
});

// ─── Labels, shortcuts and state ──────────────────────────────────────────────

describe("buildSelectionContextMenu — entries", () => {
  it("renders the reference shortcuts", () => {
    const items = singleSelectionMenu();
    expect(byLabel(items, "Copy").shortcut).toBe("Ctrl+C");
    expect(byLabel(items, "Cut").shortcut).toBe("Ctrl+X");
    expect(byLabel(items, "Paste here").shortcut).toBe("Ctrl+V");
    expect(byLabel(items, "Duplicate").shortcut).toBe("Ctrl+D");
    expect(byLabel(items, "Delete").shortcut).toBe("⌫");
    expect(byLabel(items, "Bring to front").shortcut).toBe("]");
    expect(byLabel(items, "Send to back").shortcut).toBe("[");
    expect(byLabel(items, "Group selection").shortcut).toBe("Ctrl+G");
    expect(byLabel(items, "Frame selection").shortcut).toBe("Ctrl+Alt+G");
    expect(byLabel(items, "Add auto layout").shortcut).toBe("Shift+A");
    expect(byLabel(items, "Use as mask").shortcut).toBe("Ctrl+Alt+M");
    expect(byLabel(items, "Flatten").shortcut).toBe("Alt+Shift+F");
    expect(byLabel(items, "Create component").shortcut).toBe("Ctrl+Alt+K");
    expect(byLabel(items, "Show/Hide").shortcut).toBe("Ctrl+Shift+H");
    expect(byLabel(items, "Lock/Unlock").shortcut).toBe("Ctrl+Shift+L");
    expect(byLabel(items, "Flip horizontal").shortcut).toBe("Shift+H");
    expect(byLabel(items, "Flip vertical").shortcut).toBe("Shift+V");
  });

  it("leaves Paste to replace and both outline rows shortcut-less", () => {
    const items = singleSelectionMenu();
    expect(byLabel(items, "Paste to replace").shortcut).toBeUndefined();
    expect(byLabel(items, "Outline text").shortcut).toBeUndefined();
    expect(byLabel(items, "Outline stroke").shortcut).toBeUndefined();
  });

  it("disables what the selection cannot do and enables what it can", () => {
    const items = singleSelectionMenu();
    // Needs two same-parent layers.
    expect(byLabel(items, "Group selection").disabled).toBe(true);
    // A lone root shape can be framed, outlined and auto-laid-out.
    expect(byLabel(items, "Frame selection").disabled).toBe(false);
    expect(byLabel(items, "Add auto layout").disabled).toBe(false);
    expect(byLabel(items, "Outline stroke").disabled).toBe(false);
    // No text in the selection, and nothing on the clipboard.
    expect(byLabel(items, "Outline text").disabled).toBe(true);
    expect(byLabel(items, "Paste here").disabled).toBe(true);
    expect(byLabel(items, "Paste to replace").disabled).toBe(true);
    // Transform commands act on element properties.
    expect(byLabel(items, "Flip horizontal").disabled).toBe(false);
    expect(byLabel(items, "Flip vertical").disabled).toBe(false);
    expect(byLabel(items, "Create component").disabled).toBe(false);
  });

  it("marks Create component as the accented row", () => {
    const items = singleSelectionMenu();
    expect(byLabel(items, "Create component").accent).toBe(true);
    // Everything else is a plain row.
    expect(byLabel(items, "Duplicate").accent).toBeUndefined();
  });

  it("enables the paste rows once the clipboard is populated", () => {
    const items = singleSelectionMenu({ hasClipboard: true, clipboardCount: 1 });
    expect(byLabel(items, "Paste here").disabled).toBe(false);
    expect(byLabel(items, "Paste to replace").disabled).toBe(false);
  });

  it("keeps the combined Show/Hide and Lock/Unlock labels whatever the target state", () => {
    const hidden = buildSelectionContextMenu({
      layers: [layer("a", { active: true, visible: false })],
      elementProperties: { a: shapeProps() },
      anchorLayerId: "a",
      platform: "windows",
    });
    expect(byLabel(hidden, "Show/Hide").shortcut).toBe("Ctrl+Shift+H");

    const locked = buildSelectionContextMenu({
      layers: [layer("a", { active: true, locked: true })],
      elementProperties: { a: shapeProps() },
      anchorLayerId: "a",
      platform: "windows",
    });
    expect(byLabel(locked, "Lock/Unlock").shortcut).toBe("Ctrl+Shift+L");
  });

  it("words the mask row from the target layer's mask state", () => {
    const nested = (masked: boolean) =>
      buildSelectionContextMenu({
        layers: [
          layer("outer", { type: "group" }),
          layer("inner", { parentId: "outer", active: true, masked }),
        ],
        elementProperties: { inner: shapeProps() },
        anchorLayerId: "inner",
        platform: "windows",
      });

    expect(byLabel(nested(false), "Use as mask").shortcut).toBe("Ctrl+Alt+M");
    expect(byLabel(nested(true), "Remove mask").shortcut).toBe("Ctrl+Alt+M");
  });
});

// ─── Multi-selection ──────────────────────────────────────────────────────────

describe("buildSelectionContextMenu — multi-selection", () => {
  it("keeps the whole selection and gates on it, not on the clicked layer", () => {
    const layers = [
      layer("a", { active: true }),
      layer("b", { active: true }),
    ];
    const items = buildSelectionContextMenu({
      layers,
      elementProperties: { a: shapeProps(), b: shapeProps() },
      anchorLayerId: "b",
      platform: "windows",
    });

    // Two same-parent shapes → groupable.
    expect(byLabel(items, "Group selection").disabled).toBe(false);
    // Deleting removes both.
    expect(byLabel(items, "Delete").disabled).toBe(false);
  });

  it("enables Paste to replace only when the clipboard matches the selection size", () => {
    const layers = [layer("a", { active: true }), layer("b", { active: true })];
    const props = { a: shapeProps(), b: shapeProps() };

    const matching = buildSelectionContextMenu({
      layers,
      elementProperties: props,
      anchorLayerId: "a",
      platform: "windows",
      hasClipboard: true,
      clipboardCount: 2,
    });
    expect(byLabel(matching, "Paste to replace").disabled).toBe(false);

    const mismatched = buildSelectionContextMenu({
      layers,
      elementProperties: props,
      anchorLayerId: "a",
      platform: "windows",
      hasClipboard: true,
      clipboardCount: 1,
    });
    expect(byLabel(mismatched, "Paste to replace").disabled).toBe(true);
  });
});

// ─── Copy/Paste as submenu ────────────────────────────────────────────────────

describe("buildSelectionContextMenu — Copy/Paste as submenu", () => {
  it("nests the two copy commands under the trailing submenu", () => {
    const items = singleSelectionMenu();
    const submenu = asAction(items.at(-1)!);
    expect(submenu.label).toBe("Copy/Paste as");
    expect(submenu.children?.map((child) => child.label)).toEqual([
      "Copy as PNG",
      "Copy as SVG",
    ]);
    expect(submenu.disabled).toBe(false);
  });
});
