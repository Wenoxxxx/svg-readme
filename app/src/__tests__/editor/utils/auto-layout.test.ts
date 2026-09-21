import { describe, expect, it } from "vitest";
import {
  addAutoLayout,
  applyAutoLayout,
  layerBounds,
} from "../../../lib/editor/layerOps/autoLayout";
import { DEFAULT_AUTO_LAYOUT } from "../../../context/EditorContext";
import type { LayerType } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function rect(
  id: string,
  box: { x: number; y: number; width: number; height: number },
  overrides?: Partial<LayerType>,
): LayerType {
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

function rectProps(box: { x: number; y: number; width: number; height: number }): ElementProperties {
  return {
    type: "shape",
    kind: "rect",
    ...box,
    fill: "#fff",
    stroke: "none",
    strokeWidth: 0,
    opacity: 1,
  };
}

/**
 * Two 40×20 rects at (100,100) and (200,300).
 *
 * Their union box is x:100 y:100 w:140 h:220 — the independent source of truth
 * for every expected coordinate below.
 */
function twoRects() {
  const layers = [
    rect("a", { x: 100, y: 100, width: 40, height: 20 }),
    rect("b", { x: 200, y: 300, width: 40, height: 20 }),
  ];
  const properties: Record<string, ElementProperties> = {
    a: rectProps({ x: 100, y: 100, width: 40, height: 20 }),
    b: rectProps({ x: 200, y: 300, width: 40, height: 20 }),
  };
  return { layers, properties };
}

// ─── layerBounds ──────────────────────────────────────────────────────────────

describe("layerBounds", () => {
  it("reads a leaf's box straight off its element properties", () => {
    const { layers, properties } = twoRects();
    expect(layerBounds(layers, properties, "a")).toEqual({
      x: 100,
      y: 100,
      width: 40,
      height: 20,
    });
  });

  it("unions the descendants' boxes for a container", () => {
    const layers = [
      rect("g", { x: 0, y: 0, width: 0, height: 0 }, { type: "group" }),
      rect("a", { x: 100, y: 100, width: 40, height: 20 }, { parentId: "g" }),
      rect("b", { x: 200, y: 300, width: 40, height: 20 }, { parentId: "g" }),
    ];
    const properties: Record<string, ElementProperties> = {
      a: rectProps({ x: 100, y: 100, width: 40, height: 20 }),
      b: rectProps({ x: 200, y: 300, width: 40, height: 20 }),
    };
    expect(layerBounds(layers, properties, "g")).toEqual({
      x: 100,
      y: 100,
      width: 140,
      height: 220,
    });
  });

  it("returns null for a layer with nothing measurable", () => {
    expect(layerBounds([rect("e", { x: 0, y: 0, width: 0, height: 0 }, { type: "group" })], {}, "e")).toBeNull();
  });
});

// ─── addAutoLayout ────────────────────────────────────────────────────────────

describe("addAutoLayout", () => {
  it("wraps the selection in a container carrying the layout settings", () => {
    const { layers, properties } = twoRects();
    const result = addAutoLayout(layers, properties, ["a", "b"]);
    expect(result).not.toBeNull();

    const container = result!.updatedLayers.find((l) => l.id === result!.containerId)!;
    expect(container.type).toBe("group");
    expect(container.autoLayout).toEqual(DEFAULT_AUTO_LAYOUT);

    // Both children now live inside the new container.
    expect(result!.updatedLayers.find((l) => l.id === "a")!.parentId).toBe(result!.containerId);
    expect(result!.updatedLayers.find((l) => l.id === "b")!.parentId).toBe(result!.containerId);

    // The container is inserted where the first selected layer used to be.
    expect(result!.updatedLayers[0].id).toBe(result!.containerId);
  });

  it("stacks children vertically with the default gap and padding", () => {
    const { layers, properties } = twoRects();
    const result = addAutoLayout(layers, properties, ["a", "b"])!;

    // inner origin = union origin (100,100) + padding (16,16) → (116,116)
    expect(result.updatedProperties.a).toMatchObject({ x: 116, y: 116 });
    // second child sits one row down: 116 + height 20 + gap 12 → 148
    expect(result.updatedProperties.b).toMatchObject({ x: 116, y: 148 });
  });

  it("lays children out along the horizontal axis when asked", () => {
    const { layers, properties } = twoRects();
    const result = addAutoLayout(layers, properties, ["a", "b"], {
      direction: "horizontal",
    })!;

    expect(result.updatedProperties.a).toMatchObject({ x: 116, y: 116 });
    // 116 + width 40 + gap 12 → 168
    expect(result.updatedProperties.b).toMatchObject({ x: 168, y: 116 });
  });

  it("centres children on the cross axis", () => {
    const { layers, properties } = twoRects();
    const result = addAutoLayout(layers, properties, ["a", "b"], {
      alignItems: "center",
    })!;

    // inner width = 140 - 32 = 108; (108 - 40) / 2 = 34 → x = 116 + 34
    expect(result.updatedProperties.a).toMatchObject({ x: 150, y: 116 });
    expect(result.updatedProperties.b).toMatchObject({ x: 150, y: 148 });
  });

  it("returns null when nothing is selected", () => {
    const { layers, properties } = twoRects();
    expect(addAutoLayout(layers, properties, [])).toBeNull();
  });
});

// ─── applyAutoLayout ──────────────────────────────────────────────────────────

describe("applyAutoLayout", () => {
  it("re-flows an existing container from its current children", () => {
    const layers = [
      rect("box", { x: 0, y: 0, width: 0, height: 0 }, {
        type: "group",
        autoLayout: { ...DEFAULT_AUTO_LAYOUT, gap: 0, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
      }),
      rect("a", { x: 0, y: 0, width: 40, height: 20 }, { parentId: "box" }),
      rect("b", { x: 900, y: 900, width: 40, height: 20 }, { parentId: "box" }),
    ];
    const properties: Record<string, ElementProperties> = {
      a: rectProps({ x: 0, y: 0, width: 40, height: 20 }),
      b: rectProps({ x: 900, y: 900, width: 40, height: 20 }),
    };

    const result = applyAutoLayout(layers, properties, "box")!;

    // Union origin is (0,0) with no padding → the stack starts at 0,0.
    expect(result.updatedProperties.a).toMatchObject({ x: 0, y: 0 });
    expect(result.updatedProperties.b).toMatchObject({ x: 0, y: 20 });
  });

  it("returns null for a container that has no auto layout", () => {
    const layers = [rect("g", { x: 0, y: 0, width: 0, height: 0 }, { type: "group" })];
    expect(applyAutoLayout(layers, {}, "g")).toBeNull();
  });
});
