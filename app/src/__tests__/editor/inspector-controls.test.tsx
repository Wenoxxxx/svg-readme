import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditorProvider } from "../../context/EditorContext";
import type { LayerType } from "../../context/EditorContext";
import type { ElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import EditorRightBar from "../../components/ui/EditorRightBar";
import { NumberField, MIXED } from "../../components/ui/EditorRightBar/NumberField";
import { boundsEditUpdates } from "../../components/ui/EditorRightBar/MultiEditControls";
import { moveKeyframeById, keyframesWithIds } from "../../lib/editor/timelineUtils";
import { gradientToCss, sortGradientStops } from "../../lib/editor/gradient";
import { isStrictHex, keepAlpha, parseStrictHex } from "../../lib/color";
import type { AnimationConfig } from "../../components/editor-canvas/animationPresets";

const layer = (id: string, type: LayerType["type"] = "shape"): LayerType => ({
  id, name: id, type, locked: false, visible: true,
});
const rect = (o: Partial<ElementProperties> = {}): ElementProperties => ({
  type: "shape", kind: "rect", x: 0, y: 0, width: 100, height: 50,
  fill: "#ff0000", stroke: "", strokeWidth: 0, opacity: 1, ...o,
} as ElementProperties);

describe("NumberField", () => {
  const setup = (value: number | typeof MIXED = 10, extra: Record<string, unknown> = {}) => {
    const onCommit = vi.fn();
    render(<NumberField label="X" value={value} onCommit={onCommit} {...extra} />);
    const input = screen.getByLabelText("X") as HTMLInputElement;
    fireEvent.focus(input);
    return { input, onCommit };
  };

  it("does not commit while typing; commits on Enter", () => {
    const { input, onCommit } = setup();
    fireEvent.change(input, { target: { value: "-" } });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe("-");
    fireEvent.change(input, { target: { value: "-4" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledWith(-4);
  });

  it("evaluates math expressions on blur", () => {
    const { input, onCommit } = setup();
    fireEvent.change(input, { target: { value: "100/4+5" } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(30);
  });

  it("Escape reverts without committing", () => {
    const { input, onCommit } = setup(10);
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe("10");
  });

  it("invalid input reverts", () => {
    const { input, onCommit } = setup(10);
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe("10");
  });

  it("ArrowUp/Down step by 1, Shift by 10, clamped", () => {
    const { input, onCommit } = setup(10, { max: 15 });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onCommit).toHaveBeenLastCalledWith(11);
    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
    expect(onCommit).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(input, { key: "ArrowUp", shiftKey: true });
    fireEvent.keyDown(input, { key: "ArrowUp", shiftKey: true });
    expect(onCommit).toHaveBeenLastCalledWith(15);
  });

  it("shows Mixed placeholder", () => {
    render(<NumberField label="W" value={MIXED} onCommit={() => {}} />);
    const input = screen.getByLabelText("W") as HTMLInputElement;
    expect(input.value).toBe("");
    expect(input.placeholder).toBe("Mixed");
  });

  it("scrubs by dragging the label (Shift ×10)", () => {
    const onCommit = vi.fn();
    const onScrubStart = vi.fn();
    render(<NumberField label="X" value={10} onCommit={onCommit} onScrubStart={onScrubStart} />);
    const label = screen.getByTestId("number-field-scrub");
    fireEvent.pointerDown(label, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(label, { clientX: 105, pointerId: 1 });
    expect(onScrubStart).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenLastCalledWith(15);
    fireEvent.pointerMove(label, { clientX: 103, pointerId: 1, shiftKey: true });
    expect(onCommit).toHaveBeenLastCalledWith(40);
    fireEvent.pointerUp(label, { pointerId: 1 });
  });
});

describe("Design tab", () => {
  const renderBar = (props: Record<string, ElementProperties>, ids: string[], extra: Record<string, unknown> = {}) => {
    const onUpdateProperties = vi.fn();
    const layers = Object.entries(props).map(([id, p]) => layer(id, p.type === "text" ? "text" : "shape"));
    render(
      <EditorProvider initial={{ layers, isProjectActive: true }}>
        <EditorRightBar
          selectedLayerIds={ids}
          elementProperties={props}
          onUpdateProperties={onUpdateProperties}
          onBulkUpdateProperties={vi.fn()}
          {...extra}
        />
      </EditorProvider>,
    );
    return { onUpdateProperties };
  };

  it("constrain proportions scales H with W", () => {
    const { onUpdateProperties } = renderBar({ a: rect() }, ["a"]);
    fireEvent.click(screen.getByLabelText("Constrain proportions"));
    const w = screen.getByLabelText("W");
    fireEvent.focus(w);
    fireEvent.change(w, { target: { value: "200" } });
    fireEvent.keyDown(w, { key: "Enter" });
    expect(onUpdateProperties).toHaveBeenCalledWith("a", { width: 200, height: 100 });
  });

  it("opacity is edited as a percentage", () => {
    const { onUpdateProperties } = renderBar({ a: rect({ opacity: 0.5 }) }, ["a"]);
    const op = screen.getByLabelText("Opacity") as HTMLInputElement;
    expect(op.value).toBe("50");
    fireEvent.focus(op);
    fireEvent.change(op, { target: { value: "25" } });
    fireEvent.keyDown(op, { key: "Enter" });
    expect(onUpdateProperties).toHaveBeenCalledWith("a", { opacity: 0.25 });
  });

  it("adds an effect and sets a blend mode", () => {
    const { onUpdateProperties } = renderBar({ a: rect() }, ["a"]);
    fireEvent.click(screen.getByLabelText("Add effect"));
    const call = onUpdateProperties.mock.calls.find((c) => "effects" in c[1]);
    expect(call?.[1].effects[0]).toMatchObject({ type: "drop-shadow", visible: true });
    fireEvent.change(screen.getByLabelText("Blend mode"), { target: { value: "multiply" } });
    expect(onUpdateProperties).toHaveBeenCalledWith("a", { blendMode: "multiply" });
  });

  it("independent corner radii toggle", () => {
    const { onUpdateProperties } = renderBar({ a: rect({ cornerRadius: 6 }) }, ["a"]);
    fireEvent.click(screen.getByLabelText("Independent corner radii"));
    expect(onUpdateProperties).toHaveBeenCalledWith("a", { cornerRadii: [6, 6, 6, 6] });
  });

  it("editing W on auto-width text switches to auto-height", () => {
    const text = {
      type: "text", x: 0, y: 0, width: "auto", height: 20, content: "Hello", fontFamily: "Inter",
      fontSize: 16, fontWeight: 400, color: "#fff", textAlign: "left", textAlignVertical: "top",
    } as ElementProperties;
    const { onUpdateProperties } = renderBar({ t: text }, ["t"]);
    const w = screen.getByLabelText("W");
    fireEvent.focus(w);
    fireEvent.change(w, { target: { value: "150" } });
    fireEvent.keyDown(w, { key: "Enter" });
    expect(onUpdateProperties).toHaveBeenCalledWith("t", { width: 150, textAutoResize: "HEIGHT" });
  });

  it("multi-select flip toggles shapes only (skips text) in one update", () => {
    const onUpdateMany = vi.fn();
    const text = {
      type: "text", x: 0, y: 0, width: "auto", height: 20, content: "Hi", fontFamily: "Inter",
      fontSize: 16, fontWeight: 400, color: "#fff", textAlign: "left", textAlignVertical: "top",
    } as ElementProperties;
    renderBar({ a: rect({ flipH: true } as Partial<ElementProperties>), b: rect(), t: text }, ["a", "b", "t"], { onUpdateMany });
    fireEvent.click(screen.getByTitle("Flip Horizontal (all selected)"));
    expect(onUpdateMany).toHaveBeenCalledWith({ a: { flipH: false }, b: { flipH: true } });
  });

  it("multi-select bounds edits move every layer", () => {
    const all = { a: rect({ x: 0, y: 0 }), b: rect({ x: 200, y: 100 }) };
    const u = boundsEditUpdates(["a", "b"], all, { x: 10, y: 0, width: 300, height: 150 });
    expect(u.a).toMatchObject({ x: 10, y: 0 });
    expect(u.b).toMatchObject({ x: 210, y: 100 });
  });
});

describe("Animate tab undo", () => {
  it("checkpoints preset application", () => {
    const onCheckpoint = vi.fn();
    render(
      <EditorProvider initial={{ layers: [layer("a")], elementProperties: { a: rect() }, selectedLayerIds: ["a"], selectedLayerId: "a" }}>
        <EditorRightBar activeTab="animate" onCheckpoint={onCheckpoint} />
      </EditorProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Fade In" }));
    expect(onCheckpoint).toHaveBeenCalledTimes(1);
    expect(onCheckpoint.mock.calls[0][0]).toMatch(/^anim:a/);
  });
});

describe("timeline keyframes", () => {
  const anim: AnimationConfig = {
    name: "fadeIn", duration: 1, delay: 0, iterationCount: 1, timingFunction: "ease",
    direction: "normal", fillMode: "none",
    keyframes: [{ percent: 0 }, { percent: 50 }, { percent: 100 }],
  };

  it("assigns stable ids and moves by id across re-sorts", () => {
    const ids = keyframesWithIds(anim).map((k) => k.id);
    expect(new Set(ids).size).toBe(3);
    // Drag the first marker past the second: it must stay the same marker.
    let next = moveKeyframeById(anim, ids[0], 70);
    expect(next.map((k) => k.percent)).toEqual([50, 70, 100]);
    next = moveKeyframeById({ ...anim, keyframes: next }, ids[0], 80);
    expect(next.find((k) => k.id === ids[0])?.percent).toBe(80);
    expect(next.map((k) => k.percent)).toEqual([50, 80, 100]);
  });
});

describe("color + gradient helpers", () => {
  it("strict hex validation", () => {
    expect(isStrictHex("#abc")).toBe(true);
    expect(isStrictHex("#aabbcc")).toBe(true);
    expect(isStrictHex("#aabbcc80")).toBe(true);
    expect(isStrictHex("#abcd")).toBe(false);
    expect(isStrictHex("aabbcc")).toBe(false);
    expect(parseStrictHex("#ABC")).toBe("#aabbcc");
  });

  it("preset swatch keeps alpha", () => {
    expect(keepAlpha("#00000080", "#ff0000").toLowerCase()).toBe("#ff000080");
  });

  it("gradient preview matches export angle and sorts stops", () => {
    const g = { type: "linear" as const, angle: 0, stops: [{ offset: 1, color: "#000" }, { offset: 0, color: "#fff" }] };
    expect(gradientToCss(g)).toBe("linear-gradient(90deg, #fff 0%, #000 100%)");
    expect(sortGradientStops(g.stops).map((s) => s.offset)).toEqual([0, 1]);
  });
});
