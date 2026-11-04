import { describe, it, expect } from "vitest";
import type { LayerType } from "../../../context/EditorContext";
import type {
  ElementProperties,
  ShapeElementProperties,
} from "../../../components/editor-canvas/ElementsRenderer";
import {
  deleteLayers,
  reorderSelectedLayers,
} from "../../../lib/editor/documentActions";
import {
  buildElementCss,
  buildSelectionExportDocument,
  canFlattenSelection,
  detachInstances,
  findMatchingLayerIds,
  flattenLayers,
} from "../../../lib/editor/layerOps";
import {
  buildLayerTreeIndex,
  visibleLayerRows,
} from "../../../lib/editor/layerTree/model";
import { resolveCommandTargetId } from "../../../lib/editor/selectionCapabilities";

const layer = (id: string, extra: Partial<LayerType> = {}): LayerType => ({
  id,
  name: id,
  type: "shape",
  locked: false,
  visible: true,
  parentId: null,
  ...extra,
});

const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<ShapeElementProperties> = {},
): ShapeElementProperties => ({
  type: "shape",
  kind: "rect",
  x,
  y,
  width: w,
  height: h,
  fill: "#ff0000",
  stroke: "none",
  strokeWidth: 0,
  cornerRadius: 0,
  opacity: 1,
  ...extra,
});

const ids = (layers: readonly LayerType[]) => layers.map((l) => l.id);

// ─── Display order (top row = frontmost) ────────────────────────────────────

describe("visibleLayerRows — Figma order", () => {
  it("lists siblings frontmost-first at every level", () => {
    const layers = [
      layer("back"),
      layer("group", { type: "group" }),
      layer("g-back", { parentId: "group" }),
      layer("g-front", { parentId: "group" }),
      layer("front"),
    ];
    const index = buildLayerTreeIndex(layers);
    const rows = visibleLayerRows(index.roots, index.byParent, new Set(["group"]));
    expect(rows.map((r) => r.id)).toEqual(["front", "group", "g-front", "g-back", "back"]);
  });
});

// ─── Sibling-scoped reorder ─────────────────────────────────────────────────

describe("reorderSelectedLayers — siblings only", () => {
  const layers = [
    layer("a"),
    layer("g", { type: "group" }),
    layer("g1", { parentId: "g" }),
    layer("g2", { parentId: "g" }),
    layer("b"),
  ];

  it("bring forward swaps with the next sibling, skipping other parents' children", () => {
    const next = reorderSelectedLayers(layers, ["a"], "forward");
    // `a` moves in front of the group (its next root sibling), never between g1/g2.
    expect(ids(next.filter((l) => !l.parentId))).toEqual(["g", "a", "b"]);
    expect(ids(next.filter((l) => l.parentId === "g"))).toEqual(["g1", "g2"]);
  });

  it("bring to front stays inside the group", () => {
    const next = reorderSelectedLayers(layers, ["g1"], "front");
    expect(ids(next.filter((l) => l.parentId === "g"))).toEqual(["g2", "g1"]);
    expect(ids(next.filter((l) => !l.parentId))).toEqual(["a", "g", "b"]);
  });

  it("keeps descendants attached when a group moves", () => {
    const next = reorderSelectedLayers(layers, ["g"], "back");
    expect(ids(next.filter((l) => !l.parentId))).toEqual(["g", "a", "b"]);
    expect(next.find((l) => l.id === "g1")?.parentId).toBe("g");
  });

  it("returns the same array when nothing moves", () => {
    expect(reorderSelectedLayers(layers, ["b"], "front")).toBe(layers);
  });
});

// ─── Delete ─────────────────────────────────────────────────────────────────

describe("deleteLayers", () => {
  const layers = [
    layer("g", { type: "group" }),
    layer("g1", { parentId: "g" }),
    layer("locked", { locked: true }),
    layer("free"),
  ];
  const props: Record<string, ElementProperties> = {
    g1: rect(0, 0, 10, 10),
    locked: rect(0, 0, 10, 10),
    free: rect(0, 0, 10, 10),
  };

  it("removes descendants and their element properties", () => {
    const result = deleteLayers(layers, props, ["g"]);
    expect(result && ids(result.updatedLayers)).toEqual(["locked", "free"]);
    expect(result?.updatedProperties.g1).toBeUndefined();
    expect(result?.deletedIds.sort()).toEqual(["g", "g1"]);
  });

  it("skips locked layers but still deletes the unlocked ones", () => {
    const result = deleteLayers(layers, props, ["locked", "free"]);
    expect(result && ids(result.updatedLayers)).toEqual(["g", "g1", "locked"]);
  });

  it("returns null when everything targeted is locked", () => {
    expect(deleteLayers(layers, props, ["locked"])).toBeNull();
  });
});

// ─── Select matching ────────────────────────────────────────────────────────

describe("findMatchingLayerIds", () => {
  it("selects layers with the same type and fill/stroke, skipping locked ones", () => {
    const layers = [layer("a"), layer("b"), layer("c"), layer("d", { locked: true })];
    const props: Record<string, ElementProperties> = {
      a: rect(0, 0, 10, 10),
      b: rect(50, 50, 20, 20),
      c: rect(0, 0, 10, 10, { fill: "#00ff00" }),
      d: rect(0, 0, 10, 10),
    };
    expect(findMatchingLayerIds(layers, props, ["a"])).toEqual(["a", "b"]);
  });

  it("returns nothing for an empty selection", () => {
    expect(findMatchingLayerIds([layer("a")], {}, [])).toEqual([]);
  });
});

// ─── Flatten ────────────────────────────────────────────────────────────────

describe("flattenLayers", () => {
  const layers = [layer("r1"), layer("r2"), layer("other")];
  const props: Record<string, ElementProperties> = {
    r1: rect(0, 0, 10, 10),
    r2: rect(20, 0, 10, 10, { fill: "#0000ff" }),
    other: rect(100, 100, 5, 5),
  };

  it("merges the selection into ONE path layer with subpaths", () => {
    const result = flattenLayers(layers, props, ["r1", "r2"]);
    expect(result).not.toBeNull();
    const { updatedLayers, updatedProperties, pathId } = result!;
    expect(ids(updatedLayers)).toEqual([pathId, "other"]);
    const path = updatedProperties[pathId];
    expect(path.type).toBe("path");
    if (path.type !== "path") return;
    expect(path.closed).toBe(true);
    expect(path.subpaths).toHaveLength(1);
    expect(path.x).toBe(0);
    expect(path.width).toBe(30);
    // Style comes from the frontmost layer.
    expect(path.fill).toBe("#0000ff");
    expect(updatedProperties.r1).toBeUndefined();
    expect(updatedProperties.r2).toBeUndefined();
  });

  it("flattens a group's descendants and removes the group", () => {
    const grouped = [
      layer("g", { type: "group" }),
      layer("c1", { parentId: "g" }),
      layer("c2", { parentId: "g" }),
    ];
    const result = flattenLayers(
      grouped,
      { c1: rect(0, 0, 10, 10), c2: rect(5, 5, 10, 10) },
      ["g"],
    );
    expect(result && ids(result.updatedLayers)).toEqual([result!.pathId]);
  });

  it("is unavailable for images, text and open strokes", () => {
    const mixed = [layer("r"), layer("img", { type: "image" }), layer("line")];
    const mixedProps: Record<string, ElementProperties> = {
      r: rect(0, 0, 10, 10),
      img: { type: "image", x: 0, y: 0, width: 10, height: 10, url: "x", opacity: 1 },
      line: rect(0, 0, 10, 0, { kind: "line" }),
    };
    expect(canFlattenSelection(mixed, mixedProps, ["r"])).toBe(true);
    expect(canFlattenSelection(mixed, mixedProps, ["r", "img"])).toBe(false);
    expect(canFlattenSelection(mixed, mixedProps, ["line"])).toBe(false);
    expect(flattenLayers(mixed, mixedProps, ["r", "img"])).toBeNull();
  });
});

// ─── Components ─────────────────────────────────────────────────────────────

describe("detachInstances", () => {
  it("clears the instance link and leaves masters alone", () => {
    const layers = [
      layer("m", { type: "group", isComponent: true, componentId: "m" }),
      layer("i", { type: "group", componentId: "m" }),
    ];
    const next = detachInstances(layers, ["m", "i"]);
    expect(next?.find((l) => l.id === "i")?.componentId).toBeUndefined();
    expect(next?.find((l) => l.id === "m")?.componentId).toBe("m");
    expect(detachInstances(layers, ["m"])).toBeNull();
  });
});

// ─── Selection export ───────────────────────────────────────────────────────

describe("buildSelectionExportDocument", () => {
  it("exports only the selection, cropped to its bounding box", () => {
    const layers = [layer("a"), layer("b")];
    const props: Record<string, ElementProperties> = {
      a: rect(40, 30, 20, 10),
      b: rect(0, 0, 500, 500),
    };
    const doc = buildSelectionExportDocument(layers, props, ["a"]);
    expect(doc?.frameSize).toEqual({ width: 20, height: 10 });
    expect(ids(doc!.layers)).toEqual(["a"]);
    expect(doc!.elementProperties.a).toMatchObject({ x: 0, y: 0 });
  });

  it("builds simple CSS for one element", () => {
    const css = buildElementCss(rect(0, 0, 20, 10, { cornerRadius: 4 }), "My Box");
    expect(css).toContain(".my-box {");
    expect(css).toContain("width: 20px;");
    expect(css).toContain("background: #ff0000;");
    expect(css).toContain("border-radius: 4px;");
  });
});

// ─── Menu target ────────────────────────────────────────────────────────────

describe("resolveCommandTargetId", () => {
  const layers = [layer("a"), layer("b"), layer("c")];
  it("prefers the right-clicked layer when it is selected", () => {
    expect(resolveCommandTargetId(layers, ["a", "b"], "b")).toBe("b");
  });
  it("falls back to the first selected layer in document order", () => {
    expect(resolveCommandTargetId(layers, ["c", "b"], "a")).toBe("b");
  });
});
