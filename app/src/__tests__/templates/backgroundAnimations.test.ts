import { describe, it, expect } from "vitest";
import {
  BACKGROUND_TEMPLATES,
  getBackgroundTemplate,
  isBackgroundGroup,
} from "../../lib/templates/backgroundAnimations";
import { buildSvgString } from "../../lib/export";
import { parseDesignFile, serializeDesign } from "../../lib/designFile";

describe("background animation templates", () => {
  it("ships the core templates with unique ids", () => {
    const ids = BACKGROUND_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual([
      "bg-gradient-drift",
      "bg-floating-blobs",
      "bg-wave-sweep",
      "bg-dot-grid-pulse",
      "bg-grid-parallax",
      "bg-grid-lines-parallax",
    ]);
    expect(getBackgroundTemplate("bg-wave-sweep")?.name).toBe("Wave Sweep");
    expect(getBackgroundTemplate("missing")).toBeUndefined();
  });

  it.each(BACKGROUND_TEMPLATES.map((t) => t.id))(
    "template %s builds an unlocked editable bg group with infinite animation",
    (id) => {
      const t = getBackgroundTemplate(id)!;
      const { layers, elementProperties } = t.build(800, 200);

      // Group first (bottom of stack), unlocked + bg-tagged so parts stay editable
      expect(layers.length).toBeGreaterThan(1);
      expect(layers[0].type).toBe("group");
      expect(layers[0].locked).toBe(false);
      expect(isBackgroundGroup(layers[0])).toBe(true);

      // Children linked to group and within frame bounds
      for (const child of layers.slice(1)) {
        expect(child.parentId).toBe(layers[0].id);
        const props = elementProperties[child.id];
        expect(props).toBeDefined();
        if (props?.type === "shape") {
          expect(props.x).toBeGreaterThanOrEqual(-800);
          expect(props.width).toBeGreaterThan(0);
          expect(props.height).toBeGreaterThan(0);
        }
      }

      // At least one animated layer, all infinite + transform/opacity-only
      const animated = Object.values(elementProperties).filter(
        (p) => "animation" in p && p.animation,
      );
      expect(animated.length).toBeGreaterThan(0);
      for (const p of animated) {
        const anim = (p as { animation: { iterationCount: unknown; customKeyframes?: string } }).animation;
        expect(anim.iterationCount).toBe("infinite");
        expect(anim.customKeyframes).toContain("@keyframes");
      }
    },
  );

  it("build opts customize colors and speed", () => {
    const sweep = getBackgroundTemplate("bg-wave-sweep")!;
    const def = sweep.build(800, 200);
    const custom = sweep.build(800, 200, { primary: "#111111", accent: "#ff0000", speed: 2 });
    const bandId = (b: typeof def) => b.layers.find((l) => l.name === "Sweep Band")!.id;
    const defBand = def.elementProperties[bandId(def)];
    const customBand = custom.elementProperties[bandId(custom)];
    expect(defBand?.type).toBe("shape");
    expect(customBand?.type).toBe("shape");
    if (defBand?.type === "shape" && customBand?.type === "shape") {
      expect(defBand.fill).toBe("#3b82f6");
      expect(customBand.fill).toBe("#ff0000");
      expect(defBand.animation?.duration).toBe(2.6);
      expect(customBand.animation?.duration).toBe(1.3);
    }
    const dots = getBackgroundTemplate("bg-dot-grid-pulse")!;
    const customDots = dots.build(800, 200, { accent: "#00ff00", speed: 0.5 });
    const dotId = customDots.layers.find((l) => l.name === "Dot 1")!.id;
    const firstDot = customDots.elementProperties[dotId];
    if (firstDot?.type === "shape") {
      expect(firstDot.fill).toBe("#00ff00");
      expect(firstDot.animation?.duration).toBe(3.2);
    }
  });

  it("omitted opts reproduce legacy defaults", () => {
    const drift = getBackgroundTemplate("bg-gradient-drift")!.build(800, 200);
    const baseId = drift.layers.find((l) => l.name === "Gradient Base")!.id;
    const base = drift.elementProperties[baseId];
    if (base?.type === "shape" && typeof base.fill === "object") {
      expect(base.fill).toEqual({
        type: "linear",
        angle: 135,
        stops: [
          { offset: 0, color: "#312e81" },
          { offset: 0.5, color: "#6d28d9" },
          { offset: 1, color: "#0e7490" },
        ],
      });
    } else {
      throw new Error("expected gradient base");
    }
  });

  it("dot grid caps layer count for perf", () => {
    const { layers } = getBackgroundTemplate("bg-dot-grid-pulse")!.build(1000, 220);
    expect(layers.length - 1).toBeLessThanOrEqual(24);
  });

  it.each(BACKGROUND_TEMPLATES.map((t) => t.id))(
    "template %s starts with a white recolorable base panel",
    (id) => {
      const t = getBackgroundTemplate(id)!;
      const { layers, elementProperties } = t.build(800, 200);
      const baseLayer = layers[1];
      expect(baseLayer?.name).toBe("Background Base");
      expect(baseLayer?.parentId).toBe(layers[0].id);
      const base = baseLayer ? elementProperties[baseLayer.id] : undefined;
      expect(base?.type).toBe("shape");
      if (base?.type === "shape") {
        expect(base.kind).toBe("rect");
        expect([base.x, base.y, base.width, base.height]).toEqual([0, 0, 800, 200]);
        expect(base.fill).toBe("#ffffff");
        expect(base.animation).toBeUndefined();
      }
    },
  );

  it("base panel recolor flows through to exported SVG", () => {
    const t = getBackgroundTemplate("bg-wave-sweep")!;
    const { layers, elementProperties } = t.build(800, 200);
    const baseId = layers[1].id;
    const recolored = {
      ...elementProperties,
      [baseId]: { ...elementProperties[baseId], fill: "#ff0000" },
    };
    const svg = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers,
      elementProperties: recolored,
    });
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain("@keyframes bgWaveSweep");
  });

  it("grid lines parallax drifts far grid down vs near lines up", () => {
    const { layers, elementProperties } = getBackgroundTemplate("bg-grid-lines-parallax")!.build(1000, 220);
    expect(layers.length - 1).toBeLessThanOrEqual(24);
    expect(layers.length - 1).toBeGreaterThan(4);
    const names = new Set(
      Object.values(elementProperties)
        .map((p) => ("animation" in p ? p.animation?.name : undefined))
        .filter(Boolean),
    );
    expect(names).toEqual(new Set(["bgGridLinesFar", "bgGridLinesNear"]));
    const svg = buildSvgString({
      frameSize: { width: 1000, height: 220 },
      layers,
      elementProperties,
    });
    expect(svg).toContain("@keyframes bgGridLinesFar");
    expect(svg).toContain("@keyframes bgGridLinesNear");
    expect(svg).toContain("translateY(-18px)");
    expect(svg).toContain("translateY(18px)");
    expect(svg).not.toContain("translateX");
  });

  it("grid parallax drifts two depth layers in opposite directions", () => {
    const { layers, elementProperties } = getBackgroundTemplate("bg-grid-parallax")!.build(1000, 220);
    expect(layers.length - 1).toBeLessThanOrEqual(24);
    const names = new Set(
      Object.values(elementProperties)
        .map((p) => ("animation" in p ? p.animation?.name : undefined))
        .filter(Boolean),
    );
    expect(names).toEqual(new Set(["bgGridFar", "bgGridNear"]));
    const svg = buildSvgString({
      frameSize: { width: 1000, height: 220 },
      layers,
      elementProperties,
    });
    expect(svg).toContain("@keyframes bgGridFar");
    expect(svg).toContain("@keyframes bgGridNear");
    expect(svg).toContain("translateX(-14px)");
    expect(svg).toContain("translateX(14px)");
  });

  it.each(BACKGROUND_TEMPLATES.map((t) => t.id))(
    "template %s exports SVG with keyframes + reduced-motion guard",
    (id) => {
      const t = getBackgroundTemplate(id)!;
      const { layers, elementProperties } = t.build(800, 200);
      const svg = buildSvgString({
        frameSize: { width: 800, height: 200 },
        layers,
        elementProperties,
      });
      expect(svg).toContain("@keyframes");
      expect(svg).toContain("prefers-reduced-motion");
    },
  );

  it.each(BACKGROUND_TEMPLATES.map((t) => t.id))(
    "template %s round-trips through design file schema",
    (id) => {
      const t = getBackgroundTemplate(id)!;
      const built = t.build(640, 160);
      const file = serializeDesign(
        { ...built, frameSize: { width: 640, height: 160 } },
        t.name,
      );
      const parsed = parseDesignFile(JSON.parse(JSON.stringify(file)));
      expect(parsed.doc.layers.length).toBe(built.layers.length);
      expect(parsed.name).toBe(t.name);
    },
  );
});
