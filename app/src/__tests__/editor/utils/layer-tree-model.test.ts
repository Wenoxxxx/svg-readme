import { describe, it, expect } from "vitest";
import {
  buildLayerTreeIndex,
  collectDescendantIds,
  layerSelectionForTarget,
  visibleLayerRows,
} from "../../../lib/editor/layerTree/model";
import type { LayerRow, LayerSelectionMode } from "../../../lib/editor/layerTree/types";
import type { LayerType } from "../../../context/EditorContext";

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

/**
 * root-a
 * g1 (group)
 *   child-a
 *   sub (group)
 *     grandchild
 *   child-b
 * root-b
 */
function fixture(): LayerType[] {
  return [
    layer("root-a"),
    group("g1"),
    layer("child-a", { parentId: "g1" }),
    group("sub", { parentId: "g1" }),
    layer("grandchild", { parentId: "sub" }),
    layer("child-b", { parentId: "g1" }),
    layer("root-b"),
  ];
}

const plain: LayerSelectionMode = { additive: false, range: false };
const additive: LayerSelectionMode = { additive: true, range: false };
const range: LayerSelectionMode = { additive: false, range: true };
const additiveRange: LayerSelectionMode = { additive: true, range: true };

function idsOf(rows: LayerRow[]): string[] {
  return rows.map((row) => row.id);
}

// ─── buildLayerTreeIndex ──────────────────────────────────────────────────────

describe("buildLayerTreeIndex", () => {
  it("groups ids by parent while preserving document order", () => {
    const index = buildLayerTreeIndex(fixture());

    expect(index.roots).toEqual(["root-a", "g1", "root-b"]);
    expect(index.byParent.get(null)).toBeUndefined();
    expect(index.byParent.get("g1")).toEqual(["child-a", "sub", "child-b"]);
    expect(index.byParent.get("sub")).toEqual(["grandchild"]);
    expect(index.byId.size).toBe(7);
    expect(index.byId.get("child-a")?.parentId).toBe("g1");
  });

  it("promotes layers with a missing or self-referential parent to the root level", () => {
    const index = buildLayerTreeIndex([
      layer("orphan", { parentId: "does-not-exist" }),
      layer("self", { parentId: "self" }),
      layer("root"),
    ]);

    expect(index.roots).toEqual(["orphan", "self", "root"]);
    expect([...index.byParent.values()].flat()).toEqual([]);
  });

  it("promotes layers trapped in a parent cycle instead of dropping them", () => {
    const index = buildLayerTreeIndex([
      layer("a", { parentId: "b" }),
      layer("b", { parentId: "a" }),
    ]);

    expect(index.roots.sort()).toEqual(["a", "b"]);
    const rows = visibleLayerRows(index.roots, index.byParent, new Set());
    expect(idsOf(rows).sort()).toEqual(["a", "b"]);
  });
});

// ─── visibleLayerRows ─────────────────────────────────────────────────────────

describe("visibleLayerRows", () => {
  it("emits rows depth-first with 1-based levels and child flags", () => {
    const index = buildLayerTreeIndex(fixture());
    const rows = visibleLayerRows(
      index.roots,
      index.byParent,
      new Set(["g1", "sub"]),
    );

    expect(rows.map((row) => [row.id, row.level, row.hasChildren])).toEqual([
      ["root-a", 1, false],
      ["g1", 1, true],
      ["child-a", 2, false],
      ["sub", 2, true],
      ["grandchild", 3, false],
      ["child-b", 2, false],
      ["root-b", 1, false],
    ]);
  });

  it("excludes children of collapsed layers", () => {
    const index = buildLayerTreeIndex(fixture());

    expect(idsOf(visibleLayerRows(index.roots, index.byParent, new Set()))).toEqual([
      "root-a",
      "g1",
      "root-b",
    ]);

    // g1 is open but its nested group `sub` is not.
    expect(
      idsOf(visibleLayerRows(index.roots, index.byParent, new Set(["g1"]))),
    ).toEqual(["root-a", "g1", "child-a", "sub", "child-b", "root-b"]);
  });

  it("emits each id at most once", () => {
    const index = buildLayerTreeIndex(fixture());
    const rows = visibleLayerRows(
      ["root-a", "root-a", ...index.roots],
      index.byParent,
      new Set(["g1", "sub"]),
    );
    const ids = idsOf(rows);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(7);
  });
});

// ─── layerSelectionForTarget ──────────────────────────────────────────────────

describe("layerSelectionForTarget", () => {
  const visible = [
    "root-a",
    "g1",
    "child-a",
    "sub",
    "child-b",
    "root-b",
  ];

  it("replaces the selection on a plain click", () => {
    const next = layerSelectionForTarget(
      visible,
      new Set(["root-a", "g1"]),
      "root-a",
      "child-b",
      plain,
    );
    expect([...next]).toEqual(["child-b"]);
  });

  it("toggles the target in and out for additive (Meta/Ctrl) clicks", () => {
    const added = layerSelectionForTarget(
      visible,
      new Set(["root-a"]),
      "root-a",
      "g1",
      additive,
    );
    expect([...added].sort()).toEqual(["g1", "root-a"]);

    const removed = layerSelectionForTarget(
      visible,
      new Set(["root-a", "g1"]),
      "root-a",
      "g1",
      additive,
    );
    expect([...removed]).toEqual(["root-a"]);
  });

  it("selects the contiguous slice for a shift range, skipping collapsed descendants", () => {
    const next = layerSelectionForTarget(
      visible,
      new Set(),
      "child-a",
      "child-b",
      range,
    );
    // `grandchild` is collapsed away, so it is not part of the slice.
    expect([...next]).toEqual(["child-a", "sub", "child-b"]);
  });

  it("works in either direction and unions with an additive range", () => {
    const backwards = layerSelectionForTarget(
      visible,
      new Set(),
      "root-b",
      "child-a",
      range,
    );
    expect([...backwards]).toEqual(["child-a", "sub", "child-b", "root-b"]);

    const union = layerSelectionForTarget(
      visible,
      new Set(["root-a"]),
      "child-b",
      "root-b",
      additiveRange,
    );
    expect([...union].sort()).toEqual(["child-b", "root-a", "root-b"]);
  });

  it("falls back to a plain selection when the anchor is unknown or vanished", () => {
    const unknown = layerSelectionForTarget(
      visible,
      new Set(["root-a"]),
      "deleted-layer",
      "child-b",
      range,
    );
    expect([...unknown]).toEqual(["child-b"]);

    const noAnchor = layerSelectionForTarget(
      visible,
      new Set(["root-a"]),
      null,
      "child-b",
      range,
    );
    expect([...noAnchor]).toEqual(["child-b"]);
  });

  it("falls back to a plain selection when the target is not visible", () => {
    const next = layerSelectionForTarget(
      visible,
      new Set(),
      "root-a",
      "grandchild",
      range,
    );
    expect([...next]).toEqual(["grandchild"]);
  });

  it("does not mutate the incoming selection", () => {
    const current = new Set(["root-a"]);
    layerSelectionForTarget(visible, current, "root-a", "g1", additive);
    expect([...current]).toEqual(["root-a"]);
  });
});

// ─── collectDescendantIds ─────────────────────────────────────────────────────

describe("collectDescendantIds", () => {
  it("returns every descendant depth-first, excluding the layer itself", () => {
    expect(collectDescendantIds(fixture(), "g1")).toEqual([
      "child-a",
      "sub",
      "grandchild",
      "child-b",
    ]);
    expect(collectDescendantIds(fixture(), "sub")).toEqual(["grandchild"]);
    expect(collectDescendantIds(fixture(), "child-b")).toEqual([]);
  });

  it("returns nothing for an unknown id", () => {
    expect(collectDescendantIds(fixture(), "ghost")).toEqual([]);
  });
});
