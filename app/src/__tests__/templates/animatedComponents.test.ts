import { describe, it, expect } from "vitest";
import {
  ANIMATED_COMPONENTS,
  getAnimatedComponent,
} from "../../lib/templates/animatedComponents";
import { buildSvgString } from "../../lib/export";
import { parseDesignFile, serializeDesign } from "../../lib/designFile";

describe("animated banner kits", () => {
  it("ships 3 kits with unique ids", () => {
    expect(ANIMATED_COMPONENTS.map((c) => c.id)).toEqual([
      "kit-profile-hero",
      "kit-project-showcase",
      "kit-stats-strip",
    ]);
    expect(getAnimatedComponent("kit-profile-hero")?.name).toBe("Profile Hero");
    expect(getAnimatedComponent("missing")).toBeUndefined();
  });

  it.each(ANIMATED_COMPONENTS.map((c) => c.id))(
    "kit %s builds an unlocked editable group with text",
    (id) => {
      const kit = getAnimatedComponent(id)!;
      const { layers, elementProperties, selectId } = kit.build(800, 200);

      expect(layers[0].id).toBe(selectId);
      expect(layers[0].type).toBe("group");
      expect(layers[0].locked).toBe(false);
      for (const child of layers.slice(1)) {
        expect(child.parentId).toBe(selectId);
        expect(child.locked).toBe(false);
      }

      const texts = Object.values(elementProperties).filter((p) => p.type === "text");
      expect(texts.length).toBeGreaterThan(0);
      for (const t of texts) {
        if (t.type !== "text") continue;
        expect(t.content.length).toBeGreaterThan(0);
      }
    },
  );

  it.each(ANIMATED_COMPONENTS.map((c) => c.id))(
    "kit %s exports keyframes + reduced-motion guard",
    (id) => {
      const kit = getAnimatedComponent(id)!;
      const { layers, elementProperties } = kit.build(800, 200);
      const svg = buildSvgString({
        frameSize: { width: 800, height: 200 },
        layers,
        elementProperties,
      });
      expect(svg).toContain("@keyframes");
      expect(svg).toContain("prefers-reduced-motion");
    },
  );

  it.each(ANIMATED_COMPONENTS.map((c) => c.id))(
    "kit %s round-trips through design file schema",
    (id) => {
      const kit = getAnimatedComponent(id)!;
      const built = kit.build(640, 160);
      const file = serializeDesign(
        { layers: built.layers, elementProperties: built.elementProperties, frameSize: { width: 640, height: 160 } },
        kit.name,
      );
      const parsed = parseDesignFile(JSON.parse(JSON.stringify(file)));
      expect(parsed.doc.layers.length).toBe(built.layers.length);
    },
  );

  it("repeated builds produce unique instance ids", () => {
    const a = getAnimatedComponent("kit-profile-hero")!.build(800, 200);
    const b = getAnimatedComponent("kit-profile-hero")!.build(800, 200);
    expect(a.selectId).not.toBe(b.selectId);
  });
});
