import { describe, it, expect } from "vitest";
import {
  serializeDesign,
  parseDesignFile,
  parseDesignJson,
  getDesignFilename,
  estimateDesignJsonSize,
  DesignFileError,
} from "../../lib/designFile";
import type { LayerType } from "../../context/EditorContext";

function makeDoc() {
  const layers: LayerType[] = [
    { id: "l1", name: "Text", type: "text", locked: false, visible: true },
    { id: "l2", name: "Rect", type: "shape", locked: false, visible: true, parentId: null },
  ];
  return {
    layers,
    elementProperties: {
      l1: { type: "text", x: 1, y: 2, width: 10, height: 10, content: "hi" },
      l2: { type: "shape", kind: "rect", x: 0, y: 0, width: 5, height: 5 },
    },
    frameSize: { width: 800, height: 200 },
  } as unknown as Parameters<typeof serializeDesign>[0];
}

describe("designFile", () => {
  it("roundtrips serialize -> parse", () => {
    const file = serializeDesign(makeDoc(), "My Banner");
    const { doc, name } = parseDesignFile(JSON.parse(JSON.stringify(file)));
    expect(name).toBe("My Banner");
    expect(doc.frameSize).toEqual({ width: 800, height: 200 });
    expect(doc.layers.map((l) => l.id)).toEqual(["l1", "l2"]);
    expect(Object.keys(doc.elementProperties).sort()).toEqual(["l1", "l2"]);
  });

  it("rejects non-JSON text", () => {
    expect(() => parseDesignJson("not json")).toThrow(DesignFileError);
  });

  it("rejects wrong version / kind", () => {
    expect(() => parseDesignFile({ version: 99, kind: "svg-readme-design" })).toThrow(
      DesignFileError,
    );
    expect(() => parseDesignFile({ version: 1, kind: "nope" })).toThrow(DesignFileError);
  });

  it("rejects bad frameSize, duplicate ids, bad element type", () => {
    const base = serializeDesign(makeDoc(), "x");
    expect(() => parseDesignFile({ ...base, frameSize: { width: 0, height: 10 } })).toThrow(
      DesignFileError,
    );
    expect(() =>
      parseDesignFile({ ...base, layers: [...base.layers, base.layers[0]] }),
    ).toThrow(/Duplicate layer id/);
    expect(() =>
      parseDesignFile({
        ...base,
        elementProperties: { l1: { type: "bogus" } },
      }),
    ).toThrow(/type must be one of/);
  });

  it("drops orphan elementProperties with no matching layer", () => {
    const base = serializeDesign(makeDoc(), "x");
    const { doc } = parseDesignFile({
      ...base,
      elementProperties: { ...base.elementProperties, ghost: { type: "shape" } },
    });
    expect(doc.elementProperties["ghost"]).toBeUndefined();
  });

  it("preserves image dataURLs", () => {
    const doc = makeDoc();
    (doc.elementProperties as Record<string, unknown>)["l2"] = {
      type: "image",
      x: 0,
      y: 0,
      width: 4,
      height: 4,
      url: "data:image/png;base64,AAA",
      opacity: 1,
    };
    const { doc: out } = parseDesignFile(JSON.parse(JSON.stringify(serializeDesign(doc, "img"))));
    expect((out.elementProperties["l2"] as { url: string }).url).toBe("data:image/png;base64,AAA");
  });

  it("builds safe filenames", () => {
    expect(getDesignFilename("My Banner!")).toBe("my-banner.svg-readme.json");
    expect(getDesignFilename("   ")).toBe("untitled.svg-readme.json");
  });

  it("estimates JSON size", () => {
    expect(estimateDesignJsonSize(makeDoc(), "x")).toBeGreaterThan(100);
  });
});
