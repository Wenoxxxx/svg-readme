import { describe, it, expect } from "vitest";
import { getTextBoundingBox } from "../../../components/editor-canvas/ElementsRenderer";
import type { TextElementProperties } from "../../../components/editor-canvas/ElementsRenderer";

/** Factory for text element properties */
function makeTextProps(
  overrides?: Partial<TextElementProperties>,
): TextElementProperties {
  return {
    type: "text",
    x: 100,
    y: 100,
    width: "auto",
    height: 30,
    content: "Hello",
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: 400,
    color: "#ffffff",
    textAlign: "left",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  getTextBoundingBox — pure function tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("getTextBoundingBox (used by ElementsRenderer for selection highlights)", () => {
  // Figma: Selected layer shows a blue bounding box around the element
  it("returns correct bounding box for auto-width left-aligned text", () => {
    const props = makeTextProps({
      x: 100,
      y: 100,
      content: "Hi",
      fontSize: 16,
      textAlign: "left",
    });
    const bb = getTextBoundingBox(props);
    expect(bb.x).toBeCloseTo(96);
    expect(bb.y).toBeCloseTo(86.4);
    expect(bb.width).toBeCloseTo(28, 0);
    expect(bb.height).toBeCloseTo(26.4, 1);
  });

  // Figma: Center-aligned text has a centered bounding box
  it("returns correct bounding box for center-aligned text", () => {
    const props = makeTextProps({
      x: 200,
      y: 150,
      content: "Hello",
      fontSize: 20,
      textAlign: "center",
    });
    const bb = getTextBoundingBox(props);
    expect(bb.x).toBeCloseTo(166);
    expect(bb.width).toBeCloseTo(68);
  });

  // Figma: Right-aligned text has a right-anchored bounding box
  it("returns correct bounding box for right-aligned text", () => {
    const props = makeTextProps({
      x: 300,
      y: 200,
      content: "Test",
      fontSize: 16,
      textAlign: "right",
    });
    const bb = getTextBoundingBox(props);
    expect(bb.x).toBeCloseTo(257.6);
  });

  // Figma: Fixed-width text box uses explicit dimensions
  it("returns correct bounding box for fixed-width text", () => {
    const props = makeTextProps({
      x: 50,
      y: 50,
      width: 200,
      height: 100,
      content: "Long content here",
      textAlign: "left",
    });
    const bb = getTextBoundingBox(props);
    expect(bb.x).toBeCloseTo(46);
    expect(bb.width).toBe(208);
    expect(bb.height).toBe(104);
  });

  // Figma: Empty text has a minimum width
  it("returns minimum width for empty text content", () => {
    const props = makeTextProps({ content: "", fontSize: 16 });
    const bb = getTextBoundingBox(props);
    expect(bb.width).toBe(28);
  });
});
