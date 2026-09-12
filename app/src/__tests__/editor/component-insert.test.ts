import { describe, it, expect } from "vitest";
import type { LayerType } from "../../context/EditorContext";
import type { ElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import {
  appendComponentToDocument,
  replaceBackgroundInDocument,
} from "../../pages/editor/hooks/useComponentInsert";
import { getAnimatedComponent } from "../../lib/templates/animatedComponents";
import { getBackgroundTemplate } from "../../lib/templates/backgroundAnimations";

const textLayer = (id: string): LayerType => ({
  id,
  name: id,
  type: "text",
  locked: false,
  visible: true,
  active: false,
  parentId: null,
});

const textProps = (id: string): ElementProperties =>
  ({
    type: "text",
    x: 10,
    y: 10,
    width: "auto",
    height: 24,
    content: id,
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: 400,
    color: "#fff",
    textAlign: "left",
    textAlignVertical: "top",
  }) as ElementProperties;

describe("component insert document helpers", () => {
  it("appends kit group on top and keeps existing layers", () => {
    const doc = {
      layers: [textLayer("existing")],
      elementProperties: { existing: textProps("existing") },
    };
    const kit = getAnimatedComponent("kit-profile-hero")!.build(800, 200);
    const next = appendComponentToDocument(doc, kit);
    expect(next.layers[0].id).toBe("existing");
    expect(next.layers[0].active).toBe(false);
    expect(next.layers.some((l) => l.id === kit.selectId)).toBe(true);
    expect(next.elementProperties.existing).toBeDefined();
    expect(next.elementProperties[`${kit.selectId}-handle`]).toBeDefined();
  });

  it("remaps ids on collision instead of overwriting", () => {
    const kit = getAnimatedComponent("kit-stats-strip")!.build(800, 200);
    const doc = {
      layers: kit.layers.map((l) => ({ ...l })),
      elementProperties: { ...kit.elementProperties },
    };
    const kit2 = getAnimatedComponent("kit-stats-strip")!.build(800, 200);
    // Force collision by reusing exact ids
    const colliding = { ...kit2, layers: kit.layers, elementProperties: kit.elementProperties, selectId: kit.layers[0].id };
    const next = appendComponentToDocument(doc, colliding);
    expect(next.layers.length).toBe(kit.layers.length * 2);
    expect(new Set(next.layers.map((l) => l.id)).size).toBe(next.layers.length);
  });

  it("append returns the usable selectId after remap", () => {
    const kit = getAnimatedComponent("kit-stats-strip")!.build(800, 200);
    const doc = {
      layers: kit.layers.map((l) => ({ ...l })),
      elementProperties: { ...kit.elementProperties },
    };
    const colliding = { ...kit, layers: kit.layers, elementProperties: kit.elementProperties, selectId: kit.layers[0].id };
    const next = appendComponentToDocument(doc, colliding);
    expect(next.selectId).not.toBe(kit.layers[0].id);
    expect(next.layers.some((l) => l.id === next.selectId)).toBe(true);
    expect(next.layers.find((l) => l.id === next.selectId)?.active).toBe(true);
  });

  it("replaces bg group but keeps foreground layers", () => {
    const bg = getBackgroundTemplate("bg-gradient-drift")!.build(800, 200);
    const doc = {
      layers: [...bg.layers, textLayer("foreground")],
      elementProperties: { ...bg.elementProperties, foreground: textProps("foreground") },
    };
    const sweep = getBackgroundTemplate("bg-wave-sweep")!.build(800, 200);
    const next = replaceBackgroundInDocument(doc, sweep);
    expect(next.layers.some((l) => l.id === "foreground")).toBe(true);
    expect(next.layers.some((l) => l.id === bg.layers[0].id)).toBe(false);
    expect(next.layers[0].id).toBe(sweep.layers[0].id);
    expect(next.elementProperties.foreground).toBeDefined();
    expect(next.elementProperties[bg.layers[1].id]).toBeUndefined();
  });

  it("replace preserves the original bg slot and clears stale active flags", () => {
    const bg = getBackgroundTemplate("bg-gradient-drift")!.build(800, 200);
    const header = { ...textLayer("header"), active: true };
    const footer = textLayer("footer");
    const doc = {
      layers: [header, ...bg.layers, footer],
      elementProperties: { ...bg.elementProperties, header: textProps("header"), footer: textProps("footer") },
    };
    const sweep = getBackgroundTemplate("bg-wave-sweep")!.build(800, 200);
    const next = replaceBackgroundInDocument(doc, sweep);
    const ids = next.layers.map((l) => l.id);
    // New bg lands where the old bg group sat (index 1), foreground order kept.
    expect(ids[0]).toBe("header");
    expect(ids[1]).toBe(sweep.layers[0].id);
    expect(ids[ids.length - 1]).toBe("footer");
    expect(next.layers.every((l) => l.active === false)).toBe(true);
  });

  it("replace remaps colliding bg ids instead of overwriting", () => {
    const bg = getBackgroundTemplate("bg-wave-sweep")!.build(800, 200);
    const doc = {
      layers: [...bg.layers, textLayer("foreground")],
      elementProperties: { ...bg.elementProperties, foreground: textProps("foreground") },
    };
    // Same template rebuilt in the same ms → identical ids.
    const colliding = { layers: bg.layers, elementProperties: bg.elementProperties };
    const next = replaceBackgroundInDocument(doc, colliding);
    expect(new Set(next.layers.map((l) => l.id)).size).toBe(next.layers.length);
    expect(next.layers.some((l) => l.id === "foreground")).toBe(true);
  });
});
