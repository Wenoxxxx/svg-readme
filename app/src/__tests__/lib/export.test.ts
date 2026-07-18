import { describe, it, expect } from "vitest";
import { buildSvgString } from "../../lib/export";
import type { LayerType } from "../../context/EditorContext";
import type { TextElementProperties } from "../../components/editor-canvas/ElementsRenderer";

// ═══════════════════════════════════════════════════════════════════════════════
//  buildSvgString — pure function tests (TDD approach)
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildSvgString", () => {
  // ── Fixture helpers ──────────────────────────────────────────────────────────

  const makeLayer = (overrides?: Partial<LayerType>): LayerType => ({
    id: `layer-${Date.now()}`,
    name: "Text Layer",
    type: "text",
    locked: false,
    visible: true,
    ...overrides,
  });

  const makeTextProps = (
    overrides?: Partial<TextElementProperties>,
  ): TextElementProperties => ({
    type: "text",
    x: 100,
    y: 100,
    width: "auto",
    height: 30,
    content: "Hello World",
    fontFamily: "Poppins",
    fontSize: 16,
    fontWeight: 400,
    color: "#ffffff",
    textAlign: "left",
    ...overrides,
  });

  // ── RED: Write failing test first ────────────────────────────────────────────

  // Test 1: Generated SVG should be valid XML with properly escaped entities
  // This test SHOULD FAIL initially because & in Google Fonts URL is not escaped
  it("generates valid SVG XML with properly escaped ampersands", () => {
    const layers: LayerType[] = [makeLayer({ id: "text-1" })];
    const elementProperties: Record<string, TextElementProperties> = {
      "text-1": makeTextProps({ content: "Test" }),
    };

    const svgString = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers,
      elementProperties,
    });

    // Check that the SVG string does NOT contain unescaped ampersands
    // The Google Fonts URL contains & which must be &amp; in XML
    expect(svgString).not.toContain("&family=");
    expect(svgString).not.toContain("&display=");

    // Check that it DOES contain properly escaped ampersands
    expect(svgString).toContain("&amp;family=");
    expect(svgString).toContain("&amp;display=");
  });

  // Test 2: Text content should be properly escaped
  it("escapes special characters in text content", () => {
    const layers: LayerType[] = [makeLayer({ id: "text-1" })];
    const elementProperties: Record<string, TextElementProperties> = {
      "text-1": makeTextProps({ content: "Tom & Jerry <friends>" }),
    };

    const svgString = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers,
      elementProperties,
    });

    // Text content should have XML entities escaped
    expect(svgString).toContain("Tom &amp; Jerry &lt;friends&gt;");
    expect(svgString).not.toContain("Tom & Jerry");
  });

  // Test 3: Basic SVG structure is correct
  it("generates SVG with correct basic structure", () => {
    const svgString = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers: [],
      elementProperties: {},
    });

    expect(svgString).toContain("<?xml");
    expect(svgString).toContain("<svg");
    expect(svgString).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svgString).toContain("</svg>");
    expect(svgString).toContain('viewBox="0 0 800 200"');
  });

  // Test 4: Frame dimensions are correctly applied
  it("applies frame dimensions to SVG root element", () => {
    const svgString = buildSvgString({
      frameSize: { width: 1024, height: 512 },
      layers: [],
      elementProperties: {},
    });

    expect(svgString).toContain('width="1024"');
    expect(svgString).toContain('height="512"');
    expect(svgString).toContain('viewBox="0 0 1024 512"');
  });

  // Test 5: Text elements are included in output
  it("includes visible text elements in SVG output", () => {
    const layers: LayerType[] = [
      makeLayer({ id: "text-1", visible: true }),
      makeLayer({ id: "text-2", visible: false }),
    ];
    const elementProperties: Record<string, TextElementProperties> = {
      "text-1": makeTextProps({ content: "Visible Text" }),
      "text-2": makeTextProps({ content: "Hidden Text" }),
    };

    const svgString = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers,
      elementProperties,
    });

    expect(svgString).toContain("Visible Text");
    expect(svgString).not.toContain("Hidden Text");
  });

  // Test 6: Empty text content is excluded
  it("excludes empty text elements from SVG output", () => {
    const layers: LayerType[] = [makeLayer({ id: "text-1" })];
    const elementProperties: Record<string, TextElementProperties> = {
      "text-1": makeTextProps({ content: "   " }), // Whitespace only
    };

    const svgString = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers,
      elementProperties,
    });

    // Empty/whitespace-only content should be excluded
    expect(svgString).not.toContain("<text");
  });

  // Test 7: Custom background color is applied
  it("applies custom background color to rect element", () => {
    const svgString = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers: [],
      elementProperties: {},
      backgroundColor: "#ff0000",
    });

    expect(svgString).toContain('fill="#ff0000"');
  });

  // Test 8: Rounded corners option works
  it("applies rounded corners when rounded option is true", () => {
    const svgStringRounded = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers: [],
      elementProperties: {},
      rounded: true,
      borderRadius: 20,
    });

    const svgStringNotRounded = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers: [],
      elementProperties: {},
      rounded: false,
    });

    expect(svgStringRounded).toContain('rx="20"');
    expect(svgStringNotRounded).not.toContain('rx="');
  });

  // Test 9: Border option works
  it("applies border when showBorder option is true", () => {
    const svgStringWithBorder = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers: [],
      elementProperties: {},
      showBorder: true,
    });

    const svgStringNoBorder = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers: [],
      elementProperties: {},
      showBorder: false,
    });

    expect(svgStringWithBorder).toContain('stroke="rgba(255,255,255,0.10)"');
    expect(svgStringWithBorder).toContain('stroke-width="1"');
    expect(svgStringNoBorder).not.toContain("stroke=");
  });

  // Test 10: Text alignment is correctly applied
  it("applies correct text-anchor for different alignments", () => {
    const svgStringLeft = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers: [makeLayer({ id: "text-1" })],
      elementProperties: {
        "text-1": makeTextProps({ content: "Test", textAlign: "left" }),
      },
    });

    const svgStringCenter = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers: [makeLayer({ id: "text-1" })],
      elementProperties: {
        "text-1": makeTextProps({ content: "Test", textAlign: "center" }),
      },
    });

    const svgStringRight = buildSvgString({
      frameSize: { width: 800, height: 200 },
      layers: [makeLayer({ id: "text-1" })],
      elementProperties: {
        "text-1": makeTextProps({ content: "Test", textAlign: "right" }),
      },
    });

    expect(svgStringLeft).toContain('text-anchor="start"');
    expect(svgStringCenter).toContain('text-anchor="middle"');
    expect(svgStringRight).toContain('text-anchor="end"');
  });
});
