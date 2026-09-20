import { describe, expect, it } from "vitest";
import {
  LAYER_DROP_EDGE_RATIO,
  canDropOnLayer,
  resolveDragInstruction,
  resolveDropTarget,
} from "../../../lib/editor/layerTree/dragInstruction";
import { buildLayerTreeIndex } from "../../../lib/editor/layerTree/model";
import type { LayerDragInstruction } from "../../../lib/editor/layerTree/types";
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

const above: LayerDragInstruction = { type: "reorder-above" };
const below: LayerDragInstruction = { type: "reorder-below" };
const makeChild: LayerDragInstruction = { type: "make-child" };

/** The normalised lookups `resolveDropTarget` expects, built the way the panel builds them. */
function maps(layers: LayerType[]) {
  const index = buildLayerTreeIndex(layers);
  const parentById = new Map<string, string | null>();
  for (const [parentId, ids] of index.byParent) {
    for (const id of ids) parentById.set(id, parentId);
  }
  for (const id of index.roots) parentById.set(id, null);
  return {
    parentById,
    childIdsByParent: index.byParent,
    rootIds: index.roots,
  };
}

// ─── resolveDragInstruction ───────────────────────────────────────────────────

describe("resolveDragInstruction", () => {
  const ROW = 90;

  it("keys off the top / middle / bottom thirds of the row", () => {
    expect(ROW * LAYER_DROP_EDGE_RATIO).toBe(30);

    expect(
      resolveDragInstruction({ offsetY: 10, rowHeight: ROW, targetIsContainer: true }),
    ).toEqual(above);
    expect(
      resolveDragInstruction({ offsetY: 45, rowHeight: ROW, targetIsContainer: true }),
    ).toEqual(makeChild);
    expect(
      resolveDragInstruction({ offsetY: 80, rowHeight: ROW, targetIsContainer: true }),
    ).toEqual(below);
  });

  it("never makes a child of a leaf — the middle zone splits at the midpoint", () => {
    expect(
      resolveDragInstruction({ offsetY: 40, rowHeight: ROW, targetIsContainer: false }),
    ).toEqual(above);
    expect(
      resolveDragInstruction({ offsetY: 50, rowHeight: ROW, targetIsContainer: false }),
    ).toEqual(below);
  });

  it("falls back to a reposition when the row has no measured height", () => {
    // jsdom / `display: none` report a zero-height rect and every zone collapses.
    expect(
      resolveDragInstruction({ offsetY: 0, rowHeight: 0, targetIsContainer: true }),
    ).toEqual(below);
  });
});

// ─── canDropOnLayer ───────────────────────────────────────────────────────────

describe("canDropOnLayer", () => {
  const layers = fixture();

  it("rejects a missing source and dropping a layer on itself", () => {
    expect(canDropOnLayer(layers, null, "root-a")).toBe(false);
    expect(canDropOnLayer(layers, "root-a", "root-a")).toBe(false);
  });

  it("rejects any target inside the source's own subtree", () => {
    expect(canDropOnLayer(layers, "g1", "child-a")).toBe(false);
    expect(canDropOnLayer(layers, "g1", "grandchild")).toBe(false);
    expect(canDropOnLayer(layers, "sub", "grandchild")).toBe(false);
  });

  it("allows unrelated targets, including an ancestor and a sibling", () => {
    expect(canDropOnLayer(layers, "root-a", "g1")).toBe(true);
    expect(canDropOnLayer(layers, "root-a", "child-b")).toBe(true);
    expect(canDropOnLayer(layers, "grandchild", "g1")).toBe(true);
  });
});

// ─── resolveDropTarget ────────────────────────────────────────────────────────

describe("resolveDropTarget", () => {
  const layers = fixture();
  const { parentById, childIdsByParent, rootIds } = maps(layers);
  const resolve = (
    sourceId: string,
    targetId: string,
    instruction: LayerDragInstruction,
  ) =>
    resolveDropTarget({
      sourceId,
      targetId,
      instruction,
      parentById,
      childIdsByParent,
      rootIds,
    });

  it("appends to the target's children for make-child", () => {
    // `g1` already holds child-a / sub / child-b.
    expect(resolve("root-a", "g1", makeChild)).toEqual({ parentId: "g1", index: 3 });
    // An empty group is still a valid parent.
    expect(resolve("root-a", "empty-group", makeChild)).toEqual({
      parentId: "empty-group",
      index: 0,
    });
  });

  it("excludes the source from the child count when it is already a child", () => {
    expect(resolve("child-a", "g1", makeChild)).toEqual({ parentId: "g1", index: 2 });
  });

  it("slots a reposition next to the target, in the target's parent", () => {
    expect(resolve("root-b", "child-b", above)).toEqual({ parentId: "g1", index: 2 });
    expect(resolve("root-b", "child-b", below)).toEqual({ parentId: "g1", index: 3 });
    expect(resolve("root-a", "root-b", above)).toEqual({ parentId: null, index: 1 });
  });

  it("shifts the slot when the source sat above the target", () => {
    // child-a is currently the first child, so child-b's slot becomes 1 once
    // child-a is detached; putting the source back at 2 lands it below.
    expect(resolve("child-a", "child-b", below)).toEqual({ parentId: "g1", index: 2 });
    // child-b is last, so child-a's own slot is unchanged.
    expect(resolve("child-b", "child-a", above)).toEqual({ parentId: "g1", index: 0 });
  });

  it("returns null for a target that is not part of the tree", () => {
    expect(resolve("root-a", "ghost", above)).toBeNull();
  });
});
