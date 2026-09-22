import { describe, expect, it } from "vitest";
import {
  HISTORY_LIMIT,
  pushHistory,
  redoDocument,
  reorderChild,
  reorderSelectedLayers,
  undoDocument,
  type DocumentHistory,
  type DocumentSnapshot,
} from "../../../lib/editor/documentActions";
import type { LayerType } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";

const layer = (id: string): LayerType => ({
  id,
  name: id,
  type: "shape",
  locked: false,
  visible: true,
});

const props = (x: number): ElementProperties => ({
  type: "shape",
  kind: "rect",
  x,
  y: 0,
  width: 20,
  height: 20,
  fill: "#fff",
  stroke: "none",
  strokeWidth: 0,
  opacity: 1,
});

const snapshot = (ids: string[], positions = ids.map((_, index) => index)): DocumentSnapshot => ({
  layers: ids.map(layer),
  elementProperties: Object.fromEntries(ids.map((id, index) => [id, props(positions[index] ?? 0)])),
  selectedLayerIds: ids.slice(0, 1),
  frameSize: { width: 700, height: 350 },
});

const history = (past: DocumentSnapshot[], future: DocumentSnapshot[] = []): DocumentHistory => ({
  past,
  future,
});

describe("document actions", () => {
  it("undoes to the previous snapshot and preserves the current snapshot for redo", () => {
    const previous = snapshot(["one"], [10]);
    const current = snapshot(["one", "two"], [10, 30]);

    const result = undoDocument(history([previous]), current);

    expect(result.snapshot).toEqual(previous);
    expect(result.history.past).toHaveLength(0);
    expect(result.history.future).toEqual([current]);
  });

  it("redoes the oldest pending future snapshot and preserves the current snapshot for undo", () => {
    const previous = snapshot(["one"], [10]);
    const current = snapshot(["one"], [20]);
    const next = snapshot(["one", "two"], [20, 40]);

    const result = redoDocument(history([previous], [next]), current);

    expect(result.snapshot).toEqual(next);
    expect(result.history.past).toEqual([previous, current]);
    expect(result.history.future).toHaveLength(0);
  });

  it("replays multiple undone actions in their original order", () => {
    const first = snapshot(["one"], [10]);
    const second = snapshot(["one"], [20]);
    const third = snapshot(["one", "two"], [20, 40]);
    const undoneOnce = undoDocument(history([first, second]), third);
    const undoneTwice = undoDocument(undoneOnce.history, undoneOnce.snapshot!);

    const redoneOnce = redoDocument(undoneTwice.history, undoneTwice.snapshot!);
    const redoneTwice = redoDocument(redoneOnce.history, redoneOnce.snapshot!);

    expect(redoneOnce.snapshot).toEqual(second);
    expect(redoneTwice.snapshot).toEqual(third);
  });

  it("does not share mutable layer or property containers between snapshots", () => {
    const original = snapshot(["one"], [10]);
    const result = undoDocument(history([original]), snapshot(["one"], [20]));

    expect(result.snapshot).not.toBe(original);
    expect(result.snapshot?.layers).not.toBe(original.layers);
    expect(result.snapshot?.elementProperties).not.toBe(original.elementProperties);
  });

  it("carries frameSize through undo/redo snapshots", () => {
    const previous = snapshot(["one"], [10]);
    const resized = {
      ...snapshot(["one"], [10]),
      frameSize: { width: 800, height: 200 },
    };

    const undone = undoDocument(history([previous]), resized);
    expect(undone.snapshot?.frameSize).toEqual({ width: 700, height: 350 });
    // The current (resized) state is preserved for redo.
    expect(undone.history.future[0].frameSize).toEqual({ width: 800, height: 200 });
  });

  it("leaves history unchanged when undo or redo has no available snapshot", () => {
    const current = snapshot(["one"]);
    const empty = history([]);

    expect(undoDocument(empty, current)).toEqual({ history: empty, snapshot: null });
    expect(redoDocument(empty, current)).toEqual({ history: empty, snapshot: null });
  });

  it("moves selected layers one step forward or backward without changing unselected order", () => {
    const layers = [layer("a"), layer("b"), layer("c"), layer("d")];

    expect(reorderSelectedLayers(layers, ["b"], "forward").map((item) => item.id)).toEqual([
      "a",
      "c",
      "b",
      "d",
    ]);
    expect(reorderSelectedLayers(layers, ["c"], "backward").map((item) => item.id)).toEqual([
      "a",
      "c",
      "b",
      "d",
    ]);
    expect(reorderSelectedLayers(layers, ["b", "c"], "front").map((item) => item.id)).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
    expect(reorderSelectedLayers(layers, ["b", "c"], "back").map((item) => item.id)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
  });
});

describe("reorderChild", () => {
  /** A tree-shaped layer: flat document order plus a `parentId` link. */
  const node = (
    id: string,
    parentId: string | null = null,
    type: LayerType["type"] = "shape",
  ): LayerType => ({ ...layer(id), parentId, type });

  it("moves a layer to a new slot within its parent", () => {
    const layers = [layer("a"), layer("b"), layer("c"), layer("d")];

    expect(reorderChild(layers, "d", null, 1).map((l) => l.id)).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
    // Appending clamps to the end of the sibling list.
    expect(reorderChild(layers, "a", null, 99).map((l) => l.id)).toEqual([
      "b",
      "c",
      "d",
      "a",
    ]);
  });

  it("re-parents a layer under a group and appends it to that group's children", () => {
    const layers = [
      node("g", null, "group"),
      node("a", "g"),
      node("b", "g"),
      node("c"),
    ];

    const result = reorderChild(layers, "c", "g", 1);

    expect(result.map((l) => l.id)).toEqual(["g", "a", "c", "b"]);
    expect(result.find((l) => l.id === "c")?.parentId).toBe("g");
  });

  it("moves a nested layer back to the root level", () => {
    const layers = [node("g", null, "group"), node("a", "g"), layer("c")];

    const result = reorderChild(layers, "a", null, 2);

    expect(result.map((l) => l.id)).toEqual(["g", "c", "a"]);
    expect(result.find((l) => l.id === "a")?.parentId).toBeNull();
  });

  it("rejects a move into the layer's own subtree, itself, or an unknown parent", () => {
    const layers = [node("g", null, "group"), node("a", "g"), node("b", "g")];

    expect(reorderChild(layers, "g", "a", 0)).toBe(layers);
    expect(reorderChild(layers, "a", "a", 0)).toBe(layers);
    expect(reorderChild(layers, "a", "ghost", 0)).toBe(layers);
    expect(reorderChild(layers, "ghost", null, 0)).toBe(layers);
  });

  it("does not mutate the incoming document", () => {
    const layers = [layer("a"), layer("b"), layer("c")];
    const order = layers.map((l) => l.id);

    const result = reorderChild(layers, "a", null, 2);

    expect(result).not.toBe(layers);
    expect(layers.map((l) => l.id)).toEqual(order);
  });
});

describe("pushHistory", () => {
  it("appends a snapshot to the undo stack", () => {
    const s1 = snapshot(["a"]);
    const s2 = snapshot(["a", "b"]);
    const result = pushHistory(history([s1]).past, s2);
    expect(result).toEqual([s1, s2]);
  });

  it("skips a no-op push when the snapshot matches the top of the stack", () => {
    // e.g. focusing an X/Y input without changing its value records the same
    // document state twice — the second push must be ignored.
    const s1 = snapshot(["a"]);
    const duplicate = snapshot(["a"]);
    const result = pushHistory(history([s1]).past, duplicate);
    expect(result).toHaveLength(1);
    expect(result).toEqual([s1]);
  });

  it("does not treat consecutive distinct states as no-ops", () => {
    const s1 = snapshot(["a"]);
    const s2 = snapshot(["a", "b"]);
    const s3 = snapshot(["a", "b", "c"]);
    const result = pushHistory(pushHistory(history([s1]).past, s2), s3);
    expect(result).toEqual([s1, s2, s3]);
  });

  it("caps the stack at HISTORY_LIMIT, dropping the oldest entry", () => {
    let past: DocumentSnapshot[] = [];
    for (let i = 0; i < HISTORY_LIMIT; i++) {
      past = pushHistory(past, snapshot([`l${i}`]));
    }
    expect(past).toHaveLength(HISTORY_LIMIT);

    // One more push drops the oldest entry (l0), keeps the newest (overflow).
    past = pushHistory(past, snapshot(["overflow"]));
    expect(past).toHaveLength(HISTORY_LIMIT);
    expect(past[0].layers[0].id).toBe("l1");
    expect(past[HISTORY_LIMIT - 1].layers[0].id).toBe("overflow");
  });
});
