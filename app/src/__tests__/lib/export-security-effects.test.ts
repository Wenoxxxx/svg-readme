import { describe, it, expect } from "vitest";
import { buildSvgString } from "../../lib/export";
import type { LayerType } from "../../context/EditorContext";
import type {
  ElementProperties,
  ShapeElementProperties,
  TextElementProperties,
} from "../../components/editor-canvas/ElementsRenderer";
import { evaluateNumberExpression } from "../../components/ui/EditorRightBar/numberExpr";
import { buildEffectsFilter, roundedRectPath } from "../../lib/export/visualEffects";
import { resolveLayerAnimation } from "../../components/editor-canvas/animationPresets";

const layer = (id: string, type: LayerType["type"] = "shape"): LayerType => ({
  id,
  name: id,
  type,
  locked: false,
  visible: true,
});

const rect = (o: Partial<ShapeElementProperties> = {}): ShapeElementProperties => ({
  type: "shape",
  kind: "rect",
  x: 10,
  y: 10,
  width: 100,
  height: 50,
  fill: "#ff0000",
  stroke: "",
  strokeWidth: 0,
  opacity: 1,
  ...o,
});

const text = (o: Partial<TextElementProperties> = {}): TextElementProperties => ({
  type: "text",
  x: 0,
  y: 0,
  width: "auto",
  height: 30,
  content: "Hi",
  fontFamily: "Inter",
  fontSize: 16,
  fontWeight: 400,
  color: "#ffffff",
  textAlign: "left",
  textAlignVertical: "top",
  ...o,
});

const build = (layers: LayerType[], elementProperties: Record<string, ElementProperties>) =>
  buildSvgString({ frameSize: { width: 400, height: 200 }, layers, elementProperties });

/** Parse as XML and return the document (throws on malformed output). */
const parse = (svg: string) => {
  // The font @import line intentionally keeps raw `&` (replaced by fontEmbed).
  const clean = svg.replace(/^<\?xml[^>]*>\s*/, "").replace(/@import[^\n]*\n/, "");
  const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
  expect(doc.getElementsByTagName("parsererror").length).toBe(0);
  return doc;
};

describe("export security: document data cannot inject markup", () => {
  const PAYLOAD = `"/><script>alert(1)</script><g x="`;

  it("escapes shape fill / stroke / dash values", () => {
    const svg = build([layer("a")], {
      a: rect({ fill: PAYLOAD, stroke: PAYLOAD, strokeWidth: 2, strokeDashArray: PAYLOAD }),
    });
    expect(svg).not.toContain("<script");
    expect(parse(svg).getElementsByTagName("script").length).toBe(0);
  });

  it("escapes text font-family / color / background", () => {
    const svg = build([layer("t", "text")], {
      t: text({ fontFamily: PAYLOAD, color: PAYLOAD, backgroundColor: PAYLOAD }),
    });
    expect(svg).not.toContain("<script");
  });

  it("escapes gradient stop colors and hostile layer ids", () => {
    const id = `x"><script>1</script>`;
    const svg = build([layer(id)], {
      [id]: rect({ fill: { type: "linear", angle: 0, stops: [{ offset: 0, color: PAYLOAD }, { offset: 1, color: "#000" }] } as never }),
    });
    expect(svg).not.toContain("<script");
  });

  it("escapes effect colors", () => {
    const svg = build([layer("e")], {
      e: rect({ effects: [{ id: "1", type: "drop-shadow", visible: true, x: 0, y: 2, blur: 4, color: PAYLOAD }] }),
    });
    expect(svg).not.toContain("<script");
  });

  it("custom keyframes cannot close the <style> element", () => {
    const evil = `@keyframes evil { from { opacity: 0 } to { opacity: 1 } }</style><script>alert(1)</script><style>`;
    const svg = build([layer("k")], {
      k: rect({
        animation: {
          name: "evil", duration: 1, delay: 0, iterationCount: 1, timingFunction: "ease;}</style><script>x</script>",
          direction: "normal", fillMode: "none", customKeyframes: evil,
        },
      }),
    });
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("</style><");
    expect(parse(svg).getElementsByTagName("style").length).toBe(1);
  });
});

describe("effects export", () => {
  it("emits a uniquely-id'd <filter> per layer and references it", () => {
    const fx = [{ id: "1", type: "drop-shadow" as const, visible: true, x: 0, y: 4, blur: 8, color: "#00000080" }];
    const svg = build([layer("a"), layer("b")], { a: rect({ effects: fx }), b: rect({ effects: fx }) });
    expect(svg).toContain('<filter id="fx-a"');
    expect(svg).toContain('<filter id="fx-b"');
    expect(svg).toContain('filter="url(#fx-a)"');
    expect(svg).toContain('flood-opacity="0.5"');
  });

  it("skips hidden effects and emits nothing when none visible", () => {
    expect(buildEffectsFilter("a", [{ id: "1", type: "layer-blur", visible: false, x: 0, y: 0, blur: 4, color: "#000" }])).toBeNull();
  });

  it("supports inner shadow and layer blur", () => {
    const node = buildEffectsFilter("a", [
      { id: "1", type: "inner-shadow", visible: true, x: 1, y: 1, blur: 2, color: "#ff0000" },
      { id: "2", type: "layer-blur", visible: true, x: 0, y: 0, blur: 6, color: "#000" },
    ])!;
    const tags = node.children!.map((c) => c.tag);
    expect(tags).toContain("feComponentTransfer");
    expect(tags[tags.length - 1]).toBe("feGaussianBlur");
  });

  it("exports blend mode as mix-blend-mode", () => {
    const svg = build([layer("a")], { a: rect({ blendMode: "multiply" }) });
    expect(svg).toContain("mix-blend-mode:multiply");
  });

  it("exports independent corner radii as a path", () => {
    const svg = build([layer("a")], { a: rect({ cornerRadii: [0, 10, 0, 10] }) });
    expect(svg).toContain(roundedRectPath(10, 10, 100, 50, [0, 10, 0, 10]));
  });

  it("draws inside stroke as an inset outline", () => {
    const svg = build([layer("a")], { a: rect({ stroke: "#000000", strokeWidth: 4, strokePosition: "inside", cornerRadius: 0 }) });
    expect(svg).toContain('x="12" y="12" width="96" height="46"');
  });
});

describe("keyframe export", () => {
  const base = { duration: 1, delay: 0, iterationCount: 1 as const, timingFunction: "ease", direction: "normal" as const, fillMode: "none" as const };

  it("retimes preset keyframes with timeline markers under a per-layer name", () => {
    const r = resolveLayerAnimation("L1", { ...base, name: "fadeIn", keyframes: [{ percent: 20, id: "a" }, { percent: 80, id: "b" }] });
    expect(r.name).toBe("fadeIn-L1");
    expect(r.keyframesCSS).toContain("@keyframes fadeIn-L1");
    expect(r.keyframesCSS).toContain("20% {");
    expect(r.keyframesCSS).toContain("80% {");
    expect(r.css.startsWith("fadeIn-L1 ")).toBe(true);
  });

  it("exports @keyframes and matching animation rule; animation <g> carries no transform", () => {
    const svg = build([layer("t", "text")], {
      t: text({ x: 50, y: 20, animation: { ...base, name: "slideUp", keyframes: [{ percent: 0 }, { percent: 50 }] } }),
    });
    expect(svg).toContain("@keyframes slideUp-t");
    expect(svg).toMatch(/\.anim-t \{ animation: slideUp-t /);
    expect(svg).toContain("transform-box: fill-box");
    expect(svg).toMatch(/<g class="anim-t">\s*<g transform="translate\(50, 20\)">/);
  });

  it("dedupes per-layer custom keyframes by layer id", () => {
    const anim = { ...base, name: "spin", customKeyframes: "@keyframes spin { from { opacity: 0 } to { opacity: 1 } }" };
    const svg = build([layer("a"), layer("b")], { a: rect({ animation: anim }), b: rect({ animation: anim }) });
    expect(svg).toContain("@keyframes spin-a");
    expect(svg).toContain("@keyframes spin-b");
    expect(svg).toMatch(/\.anim-b \{ animation: spin-b /);
  });
});

describe("evaluateNumberExpression", () => {
  it.each([
    ["10", 10], ["-5", -5], [".5", 0.5], ["1.", 1], ["2+3*4", 14], ["(2+3)*4", 20],
    ["100/4", 25], ["10 - -2", 12], ["50%", 50], ["12px", 12], [" 3 * (1 + 1) ", 6],
  ])("%s → %d", (input, expected) => {
    expect(evaluateNumberExpression(input)).toBe(expected);
  });

  it.each(["", "-", ".", "abc", "1+", "alert(1)", "1/0", "2**3", "(1", "1)"])("rejects %j", (input) => {
    expect(evaluateNumberExpression(input)).toBeNull();
  });
});
