import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import ElementsRenderer from "../../../components/editor-canvas/ElementsRenderer";
import type { LayerType } from "../../../context/EditorContext";
import type { ShapeElementProperties } from "../../../components/editor-canvas/ElementsRenderer";

function layer(id: string, overrides: Partial<LayerType> = {}): LayerType {
  return { id, name: id, type: "shape", locked: false, visible: true, active: false, ...overrides };
}

function rect(x: number): ShapeElementProperties {
  return { type: "shape", kind: "rect", x, y: 0, width: 50, height: 50, fill: "#fff", stroke: "", strokeWidth: 0, opacity: 1 };
}

describe("locked layers are not hit-testable on canvas", () => {
  it("disables pointer events for locked layers and children of locked groups", () => {
    const layers: LayerType[] = [
      layer("free"),
      layer("locked", { locked: true }),
      layer("g", { type: "group", locked: true }),
      layer("child", { parentId: "g" }),
    ];
    const onDown = vi.fn();
    const { container } = render(
      <svg>
        <ElementsRenderer
          layers={layers}
          elementProperties={{ free: rect(0), locked: rect(60), child: rect(120) }}
          selectedLayerId={null}
          selectedLayerIds={[]}
          frameSize={{ width: 400, height: 200 }}
          onElementMouseDown={onDown}
        />
      </svg>,
    );
    const byId = (id: string) => container.querySelector(`[data-layer-id="${id}"]`) as SVGGElement;
    expect(byId("free").style.pointerEvents).toBe("");
    expect(byId("locked").style.pointerEvents).toBe("none");
    expect(byId("child").style.pointerEvents).toBe("none");
    expect(byId("g").style.pointerEvents).toBe("none");
    expect(byId("locked").getAttribute("data-locked")).toBe("true");

    fireEvent.mouseDown(byId("free"));
    expect(onDown).toHaveBeenCalledWith(expect.anything(), "free");
  });
});
