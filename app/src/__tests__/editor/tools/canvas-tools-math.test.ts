import { describe, expect, it } from "vitest";
import {
  updateResize,
  updateResizeWorld,
  snapResizeBox,
  getMovingEdges,
} from "../../../lib/editor-tools/ResizeHandler";
import { computeMultiRotation } from "../../../lib/editor-tools/RotateHandler";
import { computeWheelViewport } from "../../../lib/editor-tools/PanZoomHandler";
import { constrainToAxis, computeDragPosition } from "../../../lib/editor-tools/MoveTool";
import { addOrCloseVertex, CLOSE_THRESHOLD } from "../../../lib/editor-tools/PenTool";
import {
  getLockedLayerIds,
  fitBoundsToViewport,
  zoomAroundCenter,
  sameGuideLines,
  screenToWorld,
} from "../../../lib/editor/geometry";
import { getLineEndpoints, lineFromDrag } from "../../../components/editor-canvas/shapeHelpers";
import { getElementSnapBounds } from "../../../components/editor-canvas/boundingBox";
import { worldToElementLocal } from "../../../components/editor-canvas/Canvas/useCanvasVertexEditing";
import { renderShapeToSvgString } from "../../../lib/export/shapes";
import type { ResizeState } from "../../../components/editor-canvas/types";
import type { ShapeElementProperties, TextElementProperties } from "../../../components/editor-canvas/ElementsRenderer";
import { DEFAULT_TEXT_PROPS } from "../../../components/editor-canvas/types";

function resizeState(handle: ResizeState["handle"], extra: Partial<ResizeState> = {}): ResizeState {
  return {
    elementId: "e1",
    handle,
    startX: 0,
    startY: 0,
    initialX: 10,
    initialY: 20,
    initialWidth: 100,
    initialHeight: 50,
    ...extra,
  };
}

/** World position of a local box point for a box rotated about its center. */
function toWorld(box: { x: number; y: number; width: number; height: number }, rotation: number, lx: number, ly: number) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rad = (rotation * Math.PI) / 180;
  const dx = lx - cx;
  const dy = ly - cy;
  return { x: cx + dx * Math.cos(rad) - dy * Math.sin(rad), y: cy + dx * Math.sin(rad) + dy * Math.cos(rad) };
}

describe("resize math", () => {
  it("Shift on an edge handle grows the other axis around its center", () => {
    const r = updateResize(resizeState("mr"), 100, 0, true);
    expect(r).toEqual({ x: 10, y: -5, width: 200, height: 100 });
    const t = updateResize(resizeState("bc"), 0, 50, true);
    expect(t).toEqual({ x: -40, y: 20, width: 200, height: 100 });
  });

  it("unrotated world resize equals local resize", () => {
    expect(updateResizeWorld(resizeState("br"), 20, 10)).toEqual(updateResize(resizeState("br"), 20, 10));
  });

  it.each([30, 90, 135, -60])("rotated (%i°) resize keeps the opposite corner fixed in world space", (rotation) => {
    const state = resizeState("br", { rotation });
    const before = { x: 10, y: 20, width: 100, height: 50 };
    const anchorBefore = toWorld(before, rotation, before.x, before.y);
    // Drag along the element's local +x axis by 30 world px.
    const rad = (rotation * Math.PI) / 180;
    const box = updateResizeWorld(state, 30 * Math.cos(rad), 30 * Math.sin(rad));
    expect(box.width).toBeCloseTo(130, 6);
    expect(box.height).toBeCloseTo(50, 6);
    const anchorAfter = toWorld(box, rotation, box.x, box.y);
    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x, 6);
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y, 6);
  });

  it("rotated tl resize keeps the br corner fixed", () => {
    const rotation = 45;
    const state = resizeState("tl", { rotation });
    const before = { x: 10, y: 20, width: 100, height: 50 };
    const anchorBefore = toWorld(before, rotation, before.x + before.width, before.y + before.height);
    const box = updateResizeWorld(state, -12, 7);
    const anchorAfter = toWorld(box, rotation, box.x + box.width, box.y + box.height);
    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x, 6);
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y, 6);
  });

  it("lines may collapse to zero height", () => {
    const r = updateResize(resizeState("bc", { isLine: true }), 0, -50);
    expect(r.height).toBe(0);
  });
});

describe("resize snapping only moves dragged edges", () => {
  const siblings = [
    { x: -50, y: 200, width: 50, height: 10 }, // right edge at x = 0
    { x: 100, y: 200, width: 50, height: 10 }, // left edge at x = 100
  ];
  const box = { x: 3, y: 0, width: 95, height: 50 }; // left 3, right 98

  it("reports which edges each handle moves", () => {
    expect(getMovingEdges("mr")).toEqual({ x: "right", y: null });
    expect(getMovingEdges("tl")).toEqual({ x: "left", y: "top" });
    expect(getMovingEdges("bc")).toEqual({ x: null, y: "bottom" });
  });

  it("right handle: right edge snaps, left edge stays", () => {
    const { box: out, guides } = snapResizeBox(box, "mr", siblings);
    expect(out).toEqual({ x: 3, y: 0, width: 97, height: 50 });
    expect(guides).toHaveLength(1);
    expect(guides[0]).toMatchObject({ orientation: "vertical", value: 100 });
  });

  it("left handle: left edge snaps, right edge stays", () => {
    const { box: out } = snapResizeBox(box, "ml", siblings);
    expect(out).toEqual({ x: 0, y: 0, width: 98, height: 50 });
  });

  it("vertical edge handle never snaps horizontally", () => {
    const { box: out, guides } = snapResizeBox(box, "bc", siblings);
    expect(out.x).toBe(3);
    expect(out.width).toBe(95);
    expect(guides.every((g) => g.orientation === "horizontal")).toBe(true);
  });

  it("alt mirrors the snap on both edges", () => {
    const { box: out } = snapResizeBox(box, "mr", siblings, { altKey: true });
    // closest guide: right 98 → 100 (d=2) vs left 3 → 0 (d=-3); right wins, left mirrors.
    expect(out).toEqual({ x: 1, y: 0, width: 99, height: 50 });
  });
});

describe("line direction", () => {
  it("legacy lines (no direction) are horizontal through the middle", () => {
    expect(getLineEndpoints({ x: 0, y: 0, width: 100, height: 20 })).toEqual({ x1: 0, y1: 10, x2: 100, y2: 10 });
  });

  it("down / up directions run diagonally", () => {
    expect(getLineEndpoints({ x: 0, y: 0, width: 10, height: 20, lineDirection: "down" })).toEqual({ x1: 0, y1: 0, x2: 10, y2: 20 });
    expect(getLineEndpoints({ x: 0, y: 0, width: 10, height: 20, lineDirection: "up" })).toEqual({ x1: 0, y1: 20, x2: 10, y2: 0 });
  });

  it("lineFromDrag preserves the drag direction", () => {
    const l = lineFromDrag(10, 10, 0, 30);
    expect(l).toMatchObject({ x: 0, y: 10, width: 10, height: 20, lineDirection: "up" });
    const ends = getLineEndpoints(l);
    // Same segment as the drag (direction-agnostic).
    expect(new Set([`${ends.x1},${ends.y1}`, `${ends.x2},${ends.y2}`])).toEqual(new Set(["10,10", "0,30"]));
  });

  it("shift snaps the line angle to 45° steps", () => {
    const l = lineFromDrag(0, 0, 100, 10, true);
    expect(l.height).toBe(0);
    expect(l.width).toBeCloseTo(Math.hypot(100, 10), 6);
    const d = lineFromDrag(0, 0, 100, 90, true);
    expect(d.width).toBeCloseTo(d.height, 6);
    expect(d.lineDirection).toBe("down");
  });

  it("exports the directed line with dash and linejoin", () => {
    const props: ShapeElementProperties = {
      type: "shape", kind: "line", x: 0, y: 0, width: 10, height: 20,
      fill: "#fff", stroke: "#f00", strokeWidth: 2, opacity: 1,
      lineDirection: "up", strokeDashArray: "4 2", strokeLinejoin: "round",
    };
    const svg = renderShapeToSvgString(props);
    expect(svg).toContain('x1="0" y1="20" x2="10" y2="0"');
    expect(svg).toContain('stroke-dasharray="4 2"');
    expect(svg).toContain('stroke-linejoin="round"');
  });
});

describe("lock filtering", () => {
  it("locks descendants of locked groups", () => {
    const locked = getLockedLayerIds([
      { id: "g", locked: true },
      { id: "a", parentId: "g" },
      { id: "g2" },
      { id: "b", parentId: "g2" },
      { id: "c", parentId: "g2", locked: true },
      { id: "deep", parentId: "a" },
    ]);
    expect([...locked].sort()).toEqual(["a", "c", "deep", "g"]);
  });
});

describe("move / rotate / viewport math", () => {
  it("constrains shift-drag to the dominant axis", () => {
    expect(constrainToAxis({ x: 0, y: 0 }, { x: 10, y: 3 })).toEqual({ x: 10, y: 0 });
    expect(constrainToAxis({ x: 0, y: 0 }, { x: -2, y: -9 })).toEqual({ x: 0, y: -9 });
    const pos = computeDragPosition(
      { elementId: "a", startX: 50, startY: 50, offsetX: 5, offsetY: 5 },
      { x: 80, y: 57 },
      false,
      10,
      true,
    );
    expect(pos).toEqual({ x: 75, y: 45 });
  });

  it("multi-rotate orbits elements around the selection center and snaps with shift", () => {
    const state = {
      elementId: "__selection__",
      centerX: 50,
      centerY: 50,
      startAngle: 0,
      initialRotation: 0,
      selectionIds: ["a"],
      initialRotations: { a: 0 },
      initialPositions: { a: { x: 90, y: 40, cx: 100, cy: 50 } },
    };
    // Pointer straight below the center → +90°.
    const r = computeMultiRotation(state, 50, 100);
    expect(r.a.rotation).toBeCloseTo(90, 6);
    expect(r.a.x! + 10).toBeCloseTo(50, 6);
    expect(r.a.y! + 10).toBeCloseTo(100, 6);
    // 20° raw → snaps to 15° with shift.
    const rad = (20 * Math.PI) / 180;
    const s = computeMultiRotation(state, 50 + Math.cos(rad) * 10, 50 + Math.sin(rad) * 10, true);
    expect(s.a.rotation).toBeCloseTo(15, 6);
  });

  it("plain wheel pans, shift+wheel pans horizontally, ctrl+wheel zooms around the cursor", () => {
    const vp = { zoom: 1, panX: 0, panY: 0 };
    const base = { deltaX: 0, deltaY: 40, ctrlKey: false, metaKey: false, shiftKey: false, clientX: 0, clientY: 0 };
    expect(computeWheelViewport(base, vp, { left: 0, top: 0 })).toEqual({ zoom: 1, panX: 0, panY: -40 });
    expect(computeWheelViewport({ ...base, shiftKey: true }, vp, { left: 0, top: 0 })).toEqual({ zoom: 1, panX: -40, panY: 0 });

    const svgRect = { left: 100, top: 50 };
    const ev = { ...base, ctrlKey: true, deltaY: -10, clientX: 300, clientY: 250 };
    const next = computeWheelViewport(ev, vp, svgRect);
    expect(next.zoom).toBeGreaterThan(1);
    // The world point under the cursor is unchanged.
    const before = screenToWorld({ x: 200, y: 200 }, vp);
    const after = screenToWorld({ x: 200, y: 200 }, next);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    // Zoom step is proportional to deltaY.
    const bigger = computeWheelViewport({ ...ev, deltaY: -20 }, vp, svgRect);
    expect(bigger.zoom).toBeGreaterThan(next.zoom);
  });

  it("fits bounds and zooms around the workspace center", () => {
    const fit = fitBoundsToViewport({ x: 0, y: 0, width: 100, height: 50 }, 296, 196, 96);
    expect(fit.zoom).toBe(2);
    expect(fit).toMatchObject({ panX: 48, panY: 48 });
    const z = zoomAroundCenter({ zoom: 1, panX: 0, panY: 0 }, 2, 200, 100);
    expect(screenToWorld({ x: 100, y: 50 }, z)).toEqual({ x: 100, y: 50 });
  });

  it("compares guide lists structurally", () => {
    const g = [{ orientation: "vertical" as const, value: 1, from: 0, to: 2 }];
    expect(sameGuideLines(g, [{ ...g[0] }])).toBe(true);
    expect(sameGuideLines(g, [{ ...g[0], value: 2 }])).toBe(false);
  });
});

describe("misc canvas helpers", () => {
  it("text snap bounds have no 2px hit padding", () => {
    const text = { ...DEFAULT_TEXT_PROPS, x: 40, y: 60, content: "Hello" } as TextElementProperties;
    const bb = getElementSnapBounds(text);
    expect(bb.x).toBe(40);
    expect(bb.y).toBe(60);
  });

  it("inverse-rotates pointers for rotated path vertex drags", () => {
    const props = { x: 0, y: 0, width: 100, height: 100, rotation: 90 };
    // World (50, 100) is local (100, 50) rotated by 90° about (50, 50).
    const local = worldToElementLocal({ x: 50, y: 100 }, props);
    expect(local.x).toBeCloseTo(100, 6);
    expect(local.y).toBeCloseTo(50, 6);
    expect(worldToElementLocal({ x: 3, y: 4 }, { ...props, rotation: 0 })).toEqual({ x: 3, y: 4 });
  });

  it("pen close threshold scales with zoom (screen px)", () => {
    const state = {
      pathDragState: { points: [[0, 0], [100, 0], [100, 100]] as [number, number][], previewPoint: null, isBuilding: true, closed: false },
    };
    // 6 world px from the start: closes at zoom 1, not at zoom 4 (24 screen px).
    expect(addOrCloseVertex(state as never, 6, 0, CLOSE_THRESHOLD / 1).pathDragState?.closed).toBe(true);
    expect(addOrCloseVertex(state as never, 6, 0, CLOSE_THRESHOLD / 4).pathDragState?.closed).toBeFalsy();
  });
});
