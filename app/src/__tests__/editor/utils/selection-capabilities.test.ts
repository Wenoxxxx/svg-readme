import { describe, expect, it } from "vitest";
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

function group(id: string, overrides?: Partial<LayerType>): LayerType {
  return layer(id, { type: "group", collapsed: false, ...overrides });
}

const shapeProps = (): ElementProperties => ({
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

function caps(
  layers: LayerType[],
  selectedLayerIds: string[],
  options: {
    elementProperties?: Record<string, ElementProperties>;
    hasClipboard?: boolean;
    clipboardCount?: number;
  } = {},
) {
  return computeSelectionCapabilities({
    layers,
    selectedLayerIds,
    elementProperties: options.elementProperties ?? {},
    hasClipboard: options.hasClipboard,
    clipboardCount: options.clipboardCount,
  });
}

// ─── Clipboard capabilities ───────────────────────────────────────────────────

describe("selection capabilities — clipboard", () => {
  it("gates Copy and Cut on the selection alone", () => {
    const none = caps([layer("a")], []);
    expect(none.canCopy).toBe(false);
    expect(none.canCut).toBe(false);

    const one = caps([layer("a")], ["a"], { elementProperties: { a: shapeProps() } });
    expect(one.canCopy).toBe(true);
    expect(one.canCut).toBe(true);
  });

  it("gates Paste here on clipboard content, not the selection", () => {
    const emptyDoc = caps([], [], { hasClipboard: true });
    expect(emptyDoc.canPasteHere).toBe(true);

    const noClipboard = caps([layer("a")], ["a"], { hasClipboard: false });
    expect(noClipboard.canPasteHere).toBe(false);
  });

  it("enables Paste to replace only when the clipboard matches the selection size", () => {
    const layers = [layer("a"), layer("b")];
    const props = { a: shapeProps(), b: shapeProps() };

    expect(
      caps(layers, ["a", "b"], { elementProperties: props, hasClipboard: true, clipboardCount: 2 })
        .canPasteToReplace,
    ).toBe(true);

    // Clipboard holds a different number of layers → nothing to replace 1:1 with.
    expect(
      caps(layers, ["a", "b"], { elementProperties: props, hasClipboard: true, clipboardCount: 1 })
        .canPasteToReplace,
    ).toBe(false);

    // Nothing selected → there is nothing to replace.
    expect(
      caps(layers, [], { elementProperties: props, hasClipboard: true, clipboardCount: 1 })
        .canPasteToReplace,
    ).toBe(false);
  });
});

// ─── Structure capabilities ───────────────────────────────────────────────────

describe("selection capabilities — structure", () => {
  it("enables Add auto layout for any selection", () => {
    expect(caps([layer("a")], ["a"], { elementProperties: { a: shapeProps() } }).canAddAutoLayout).toBe(true);
    expect(caps([layer("a")], []).canAddAutoLayout).toBe(false);
  });

  it("lets a group act as a mask when it is nested", () => {
    const layers = [group("outer"), group("inner", { parentId: "outer" })];
    expect(caps(layers, ["inner"]).canMask).toBe(true);
  });

  it("keeps a root layer out of the mask command", () => {
    expect(caps([group("g")], ["g"]).canMask).toBe(false);
  });
});

// ─── Component capabilities ───────────────────────────────────────────────────

describe("selection capabilities — components", () => {
  it("enables Create component for a selection that is not already a component", () => {
    expect(caps([layer("a")], ["a"], { elementProperties: { a: shapeProps() } }).canCreateComponent).toBe(true);
  });

  it("disables Create component when the selection already is a component", () => {
    const master = group("g", { isComponent: true });
    expect(caps([master], ["g"]).canCreateComponent).toBe(false);
  });

  it("disables Create component with nothing selected", () => {
    expect(caps([layer("a")], []).canCreateComponent).toBe(false);
  });
});

// ─── Transform capabilities ───────────────────────────────────────────────────

describe("selection capabilities — transform", () => {
  it("enables Flip once a selected layer has element properties to flip", () => {
    expect(caps([layer("a")], ["a"], { elementProperties: { a: shapeProps() } }).canFlip).toBe(true);
    // A group carries no element properties of its own.
    expect(caps([group("g")], ["g"]).canFlip).toBe(false);
  });

  it("disables Flip with nothing selected", () => {
    expect(caps([layer("a")], []).canFlip).toBe(false);
  });
});
