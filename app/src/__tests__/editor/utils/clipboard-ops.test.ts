import { describe, expect, it } from "vitest";
import {
  pasteInPlace,
  replaceLayers,
  type ClipboardPayload,
} from "../../../lib/editor/layerOps/clipboardOps";
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

function props(x: number, y: number, width = 20, height = 20): ElementProperties {
  return {
    type: "shape",
    kind: "rect",
    x,
    y,
    width,
    height,
    fill: "#fff",
    stroke: "none",
    strokeWidth: 0,
    opacity: 1,
  };
}

function payload(
  layers: LayerType[],
  elementProperties: Record<string, ElementProperties>,
): ClipboardPayload {
  return { layers, elementProperties };
}

// ─── replaceLayers (Paste to replace) ─────────────────────────────────────────

describe("replaceLayers", () => {
  it("swaps each target for the matching clipboard layer, keeping the slot", () => {
    const layers = [layer("a"), layer("b"), layer("c")];
    const properties: Record<string, ElementProperties> = {
      a: props(0, 0),
      b: props(100, 0),
      c: props(200, 0),
    };
    const clip = payload([layer("x")], { x: props(500, 500) });

    const result = replaceLayers(layers, properties, ["b"], clip)!;

    // Same document slot, new identity, clipboard geometry.
    expect(result.updatedLayers.map((l) => l.id)).toEqual([
      "a",
      result.selectedIds[0],
      "c",
    ]);
    expect(result.selectedIds).toHaveLength(1);
    expect(result.updatedProperties[result.selectedIds[0]]).toMatchObject({ x: 500, y: 500 });
    // The replaced layer and its properties are gone.
    expect(result.updatedProperties.b).toBeUndefined();
  });

  it("keeps the replaced layer's parent", () => {
    const layers = [layer("outer", { type: "group" }), layer("child", { parentId: "outer" })];
    const properties: Record<string, ElementProperties> = { child: props(0, 0) };
    const clip = payload([layer("x")], { x: props(10, 10) });

    const result = replaceLayers(layers, properties, ["child"], clip)!;
    const replacement = result.updatedLayers.find((l) => l.id === result.selectedIds[0])!;
    expect(replacement.parentId).toBe("outer");
  });

  it("replaces one-for-one across a multi-selection", () => {
    const layers = [layer("a"), layer("b")];
    const properties: Record<string, ElementProperties> = { a: props(0, 0), b: props(50, 0) };
    const clip = payload(
      [layer("x"), layer("y")],
      { x: props(0, 200), y: props(50, 200) },
    );

    const result = replaceLayers(layers, properties, ["a", "b"], clip)!;
    expect(result.selectedIds).toHaveLength(2);
    expect(result.updatedLayers).toHaveLength(2);
    expect(result.updatedProperties[result.selectedIds[0]]).toMatchObject({ y: 200 });
  });

  it("brings a replaced layer's descendants along", () => {
    const layers = [layer("a"), layer("b")];
    const properties: Record<string, ElementProperties> = { a: props(0, 0), b: props(50, 0) };
    const clip = payload(
      [layer("group-target", { type: "group" }), layer("kid", { parentId: "group-target" })],
      { kid: props(0, 300) },
    );

    const result = replaceLayers(layers, properties, ["a"], clip)!;
    const newMasterId = result.selectedIds[0];

    // The clipboard group is at the target's slot, its child nested underneath.
    expect(result.updatedLayers.map((l) => l.id)).toEqual([
      newMasterId,
      expect.stringContaining("kid"),
      "b",
    ]);
    expect(result.updatedLayers[1].parentId).toBe(newMasterId);
    // Only the top-level replacement is selected.
    expect(result.updatedLayers[1].active).toBeFalsy();
  });

  it("removes the replaced layer's own descendants", () => {
    const layers = [
      layer("g", { type: "group" }),
      layer("child", { parentId: "g" }),
      layer("keep"),
    ];
    const properties: Record<string, ElementProperties> = {
      g: props(0, 0),
      child: props(0, 0),
      keep: props(0, 0),
    };
    const clip = payload([layer("x")], { x: props(9, 9) });

    const result = replaceLayers(layers, properties, ["g"], clip)!;
    expect(result.updatedLayers.map((l) => l.id)).toEqual([result.selectedIds[0], "keep"]);
    expect(result.updatedProperties.child).toBeUndefined();
  });

  it("refuses when the clipboard does not match the selection size", () => {
    const layers = [layer("a"), layer("b")];
    const clip = payload([layer("x")], { x: props(0, 0) });
    expect(replaceLayers(layers, {}, ["a", "b"], clip)).toBeNull();
  });

  it("refuses an empty clipboard or an empty selection", () => {
    expect(replaceLayers([layer("a")], {}, ["a"], payload([], {}))).toBeNull();
    expect(replaceLayers([layer("a")], {}, [], payload([layer("x")], {}))).toBeNull();
  });
});

// ─── pasteInPlace ─────────────────────────────────────────────────────────────

describe("pasteInPlace", () => {
  it("drops the copies at the clipboard's own coordinates", () => {
    const layers = [layer("a")];
    const properties: Record<string, ElementProperties> = { a: props(0, 0) };
    const clip = payload([layer("x")], { x: props(120, 40) });

    const result = pasteInPlace(layers, properties, clip)!;

    // One original + one copy, and the copy did not move.
    expect(result.updatedLayers).toHaveLength(2);
    expect(result.updatedProperties[result.selectedIds[0]]).toMatchObject({ x: 120, y: 40 });
  });

  it("preserves the copied layer's original parent when it still exists", () => {
    const layers = [layer("outer", { type: "group" }), layer("other")];
    const clip = payload([layer("x", { parentId: "outer" })], { x: props(0, 0) });

    const result = pasteInPlace(layers, {}, clip)!;
    const copy = result.updatedLayers.find((l) => l.id === result.selectedIds[0])!;
    expect(copy.parentId).toBe("outer");
  });

  it("selects the pasted copies and leaves the rest of the document alone", () => {
    const layers = [layer("a"), layer("b")];
    const clip = payload([layer("x"), layer("y")], { x: props(0, 0), y: props(10, 10) });
    const result = pasteInPlace(layers, {}, clip)!;
    expect(result.selectedIds).toHaveLength(2);
    expect(result.updatedLayers.slice(0, 2).map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("returns null for an empty clipboard", () => {
    expect(pasteInPlace([layer("a")], {}, payload([], {}))).toBeNull();
  });
});
