import { describe, expect, it } from "vitest";
import {
  createComponent,
  linkInstancesToMasters,
} from "../../../lib/editor/layerOps/components";
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

// ─── createComponent ──────────────────────────────────────────────────────────

describe("createComponent", () => {
  it("wraps the selection in a master group carrying a component id", () => {
    const layers = [layer("a"), layer("b")];
    const result = createComponent(layers, ["a", "b"]);
    expect(result).not.toBeNull();

    const master = result!.updatedLayers.find((l) => l.id === result!.masterId)!;
    expect(master.type).toBe("group");
    expect(master.isComponent).toBe(true);
    expect(master.componentId).toBe(result!.componentId);
    expect(master.componentId).toMatch(/^component-/);
  });

  it("re-parents the selection into the master and inserts it in place", () => {
    const layers = [layer("a"), layer("b"), layer("c")];
    const result = createComponent(layers, ["a", "b"])!;

    expect(result.updatedLayers.find((l) => l.id === "a")!.parentId).toBe(result.masterId);
    expect(result.updatedLayers.find((l) => l.id === "b")!.parentId).toBe(result.masterId);
    // Untouched sibling stays at the root.
    expect(result.updatedLayers.find((l) => l.id === "c")!.parentId).toBeNull();
    // The master takes the slot the first selected layer used to occupy.
    expect(result.updatedLayers.map((l) => l.id)).toEqual([
      result.masterId,
      "a",
      "b",
      "c",
    ]);
  });

  it("keeps the parent of the wrapped layers", () => {
    const layers = [group("outer"), layer("a", { parentId: "outer" })];
    const result = createComponent(layers, ["a"])!;
    const master = result.updatedLayers.find((l) => l.id === result.masterId)!;
    expect(master.parentId).toBe("outer");
    expect(result.updatedLayers.find((l) => l.id === "a")!.parentId).toBe(result.masterId);
  });

  it("returns null when nothing is selected", () => {
    expect(createComponent([layer("a")], [])).toBeNull();
  });

  it("returns null when the selected ids are not in the document", () => {
    expect(createComponent([layer("a")], ["ghost"])).toBeNull();
  });
});

// ─── linkInstancesToMasters ───────────────────────────────────────────────────

describe("linkInstancesToMasters", () => {
  it("turns a duplicate of a master into an instance pointing at it", () => {
    const master: LayerType = group("m", {
      isComponent: true,
      componentId: "component-1",
    });
    const copy: LayerType = {
      ...master,
      id: "m-duplicate-1-0",
      isComponent: true,
      componentId: "component-1",
    };

    const [linked] = linkInstancesToMasters([copy], [master]);
    expect(linked.isComponent).toBe(false);
    expect(linked.componentId).toBe("component-1");
    expect(linked.type).toBe("group");
  });

  it("falls back to the master's own id when it has no component id", () => {
    const master = group("m", { isComponent: true });
    const copy = { ...master, id: "m-duplicate-1-0" };
    const [linked] = linkInstancesToMasters([copy], [master]);
    expect(linked.componentId).toBe("m");
  });

  it("leaves duplicates of ordinary layers untouched", () => {
    const plain = group("g");
    const copy = { ...plain, id: "g-duplicate-1-0" };
    const [linked] = linkInstancesToMasters([copy], [plain]);
    expect(linked.isComponent).toBeUndefined();
    expect(linked.componentId).toBeUndefined();
  });

  it("leaves a duplicate's children alone", () => {
    const master = group("m", { isComponent: true, componentId: "component-1" });
    const child = layer("child", { parentId: "m" });
    const copies = [
      { ...master, id: "m-duplicate-1-0" },
      { ...child, id: "child-duplicate-1-1", parentId: "m-duplicate-1-0" },
    ];

    const linked = linkInstancesToMasters(copies, [master, child]);
    expect(linked[0].componentId).toBe("component-1");
    // The child is not a master, so it keeps its plain copy shape.
    expect(linked[1].componentId).toBeUndefined();
  });
});
