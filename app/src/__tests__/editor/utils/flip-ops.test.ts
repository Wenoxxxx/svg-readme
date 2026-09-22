import { describe, expect, it } from "vitest";
import { flipLayers } from "../../../lib/editor/layerOps/flip";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";

function rectProps(x = 0): ElementProperties {
  return {
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
  };
}

describe("flipLayers", () => {
  it("sets the horizontal flag on every selected layer", () => {
    const result = flipLayers({ a: rectProps(), b: rectProps(50) }, ["a", "b"], "horizontal")!;
    expect(result.updatedProperties.a).toMatchObject({ flipH: true });
    expect(result.updatedProperties.b).toMatchObject({ flipH: true });
  });

  it("sets the vertical flag independently of the horizontal one", () => {
    const result = flipLayers(
      { a: { ...rectProps(), flipH: true } },
      ["a"],
      "vertical",
    )!;
    expect(result.updatedProperties.a).toMatchObject({ flipH: true, flipV: true });
  });

  it("toggles an existing flip back off", () => {
    const result = flipLayers({ a: { ...rectProps(), flipH: true } }, ["a"], "horizontal")!;
    expect(result.updatedProperties.a).toMatchObject({ flipH: false });
  });

  it("leaves layers without element properties alone", () => {
    const result = flipLayers({ a: rectProps() }, ["a", "group-1"], "horizontal")!;
    expect(result.updatedProperties["group-1"]).toBeUndefined();
    expect(Object.keys(result.updatedProperties)).toEqual(["a"]);
  });

  it("returns null when nothing in the selection can flip", () => {
    expect(flipLayers({}, ["group-1"], "horizontal")).toBeNull();
    expect(flipLayers({ a: rectProps() }, [], "horizontal")).toBeNull();
  });
});
