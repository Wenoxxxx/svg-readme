import { describe, expect, it } from "vitest";
import { updateResize, type ResizeHandle } from "../../../lib/editor-tools/ResizeHandler";
import type { ResizeState } from "../../../components/editor-canvas/types";

/** Build a resize state for a 100×50 box at (10, 20). */
function makeState(handle: ResizeHandle): NonNullable<ResizeState> {
  return {
    elementId: "e1",
    handle,
    startX: 0,
    startY: 0,
    initialX: 10,
    initialY: 20,
    initialWidth: 100,
    initialHeight: 50,
  };
}

describe("updateResize — B3 modifiers", () => {
  it("resizes normally from the bottom-right corner without modifiers", () => {
    const result = updateResize(makeState("br"), 20, 10);
    expect(result).toEqual({ x: 10, y: 20, width: 120, height: 60 });
  });

  it("Shift keeps the aspect ratio for corner handles", () => {
    const result = updateResize(makeState("br"), 40, 20, true);
    // aspect 2:1 → width 140 → height 70
    expect(result).toEqual({ x: 10, y: 20, width: 140, height: 70 });
  });

  it("Alt resizes from the center — box re-centers on its original center (B3)", () => {
    // Original center = (60, 45). Both edges move, so dragging br by (20, 10)
    // grows the box by 2·d → 140×70, centered: x = 60 - 70, y = 45 - 35.
    const result = updateResize(makeState("br"), 20, 10, false, true);
    expect(result).toEqual({ x: -10, y: 10, width: 140, height: 70 });
  });

  it("Shift+Alt keeps the aspect ratio AND centers (B3)", () => {
    // Aspect 2:1. br drag (40, 20) → grows by 2·d → 180×90; centered on (60, 45):
    // x = 60 - 90 = -30, y = 45 - 45 = 0.
    const result = updateResize(makeState("br"), 40, 20, true, true);
    expect(result).toEqual({ x: -30, y: 0, width: 180, height: 90 });
  });

  it("Alt works from a left/top handle too — opposite edge stays fixed (B3)", () => {
    // tl handle: drag (-30, -10) → width 100+60, height 50+20; centered on (60, 45):
    // x = 60 - 80 = -20, y = 45 - 35 = 10.
    const result = updateResize(makeState("tl"), -30, -10, false, true);
    expect(result).toEqual({ x: -20, y: 10, width: 160, height: 70 });
  });

  it("Alt enforces minimum size before re-centering", () => {
    const result = updateResize(makeState("br"), -500, -500, false, true);
    // min 10×10 centered on (60, 45)
    expect(result.width).toBeGreaterThanOrEqual(10);
    expect(result.height).toBeGreaterThanOrEqual(10);
    expect(result.x).toBe(60 - result.width / 2);
    expect(result.y).toBe(45 - result.height / 2);
  });
});
