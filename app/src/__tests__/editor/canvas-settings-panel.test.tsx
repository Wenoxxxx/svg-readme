import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  EditorProvider,
  useEditor,
  type LayerType,
  type FrameSize,
} from "../../context/EditorContext";
import EditorRightBar from "../../components/ui/EditorRightBar";
import EditorLayout from "../../layouts/EditorLayout";
import type { ElementProperties } from "../../components/editor-canvas/ElementsRenderer";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function shapeLayer(id: string, name = `Shape ${id}`): LayerType {
  return { id, name, type: "shape", locked: false, visible: true, active: true };
}

function shapeProps(_id: string): ElementProperties {
  return {
    type: "shape",
    kind: "rect",
    x: 10,
    y: 10,
    width: 100,
    height: 50,
    fill: "#8b5cf6",
    stroke: "rgba(255,255,255,0.2)",
    strokeWidth: 1,
    opacity: 1,
  };
}

/** Reads frameSize out of the provider so tests can assert canvas-size changes. */
function FrameSizeProbe({
  onSize,
}: {
  onSize: (size: FrameSize) => void;
}) {
  const { frameSize } = useEditor();
  useEffect(() => {
    onSize(frameSize);
  }, [frameSize, onSize]);
  return null;
}

function renderRightBar(options?: {
  onCanvasResizeStart?: () => void;
  selectedLayerIds?: string[];
  elementProperties?: Record<string, ElementProperties>;
  layers?: LayerType[];
  initialFrameSize?: FrameSize;
}) {
  let captured: FrameSize | null = null;
  render(
    <EditorProvider
      initial={{
        layers: options?.layers,
        frameSize: options?.initialFrameSize ?? { width: 700, height: 350 },
        isProjectActive: true,
      }}
    >
      <EditorRightBar
        onCanvasResizeStart={options?.onCanvasResizeStart}
        selectedLayerIds={options?.selectedLayerIds}
        elementProperties={options?.elementProperties}
      />
      <FrameSizeProbe
        onSize={(size) => {
          captured = size;
        }}
      />
    </EditorProvider>,
  );
  return {
    getFrameSize: () => captured,
    widthInput: () => screen.getByLabelText("Canvas width") as HTMLInputElement,
    heightInput: () => screen.getByLabelText("Canvas height") as HTMLInputElement,
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ─── Canvas settings (Design tab, empty state) ───────────────────────────────

describe("CanvasSettingsPanel — no layer selected (Design tab)", () => {
  it("renders the Canvas section with W/H inputs and the three preset chips", () => {
    const { widthInput, heightInput } = renderRightBar();

    expect(screen.getByText("Canvas")).toBeDefined();
    expect(widthInput().value).toBe("700");
    expect(heightInput().value).toBe("350");
    expect(screen.getByRole("button", { name: "Banner" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Square" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Mobile" })).toBeDefined();
  });

  it("no longer renders the old 'No Selection' empty-state copy", () => {
    renderRightBar();

    expect(screen.queryByText("No Selection")).toBeNull();
    expect(screen.queryByText(/Select a layer on the canvas/i)).toBeNull();
  });

  it("updates the canvas size when the W input changes", () => {
    const { getFrameSize, widthInput } = renderRightBar();

    fireEvent.change(widthInput(), { target: { value: "800" } });
    expect(getFrameSize()).toEqual({ width: 800, height: 350 });
  });

  it("clamps width to ≥ 1 (never a 0-sized canvas)", () => {
    const { getFrameSize, widthInput } = renderRightBar();

    fireEvent.change(widthInput(), { target: { value: "0" } });
    // 0 is rejected entirely — frame keeps its previous size.
    expect(getFrameSize()).toEqual({ width: 700, height: 350 });
  });

  it("sets 500x500 when the Square preset is clicked", () => {
    const { getFrameSize } = renderRightBar();

    fireEvent.click(screen.getByRole("button", { name: "Square" }));
    expect(getFrameSize()).toEqual({ width: 500, height: 500 });
  });

  it("swaps width and height when the swap button is clicked", () => {
    const { getFrameSize } = renderRightBar();

    fireEvent.click(screen.getByRole("button", { name: "Swap width and height" }));
    expect(getFrameSize()).toEqual({ width: 350, height: 700 });
  });

  it("snapshots history once per focus and once per discrete click", () => {
    const onCanvasResizeStart = vi.fn();
    const { widthInput } = renderRightBar({ onCanvasResizeStart });

    // Focus = one history entry for the whole typing session…
    fireEvent.focus(widthInput());
    expect(onCanvasResizeStart).toHaveBeenCalledTimes(1);
    fireEvent.change(widthInput(), { target: { value: "900" } });
    fireEvent.change(widthInput(), { target: { value: "910" } });
    expect(onCanvasResizeStart).toHaveBeenCalledTimes(1);

    // …preset and swap clicks each get their own entry.
    fireEvent.click(screen.getByRole("button", { name: "Square" }));
    expect(onCanvasResizeStart).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Swap width and height" }));
    expect(onCanvasResizeStart).toHaveBeenCalledTimes(3);
  });
});

// ─── Selection-driven swap ────────────────────────────────────────────────────

describe("CanvasSettingsPanel — selection-driven swap", () => {
  it("shows layer properties and hides the Canvas section when a layer is selected", () => {
    const layers = [shapeLayer("a", "Rect Layer")];
    renderRightBar({
      layers,
      selectedLayerIds: ["a"],
      elementProperties: { a: shapeProps("a") },
    });

    expect(screen.getByText("Rect Layer")).toBeDefined();
    expect(screen.getByText("Layout")).toBeDefined();
    expect(screen.queryByText("Canvas")).toBeNull();
    expect(screen.queryByText("Presets")).toBeNull();
  });
});

// ─── Clickable top-nav chip ───────────────────────────────────────────────────

describe("Top-nav W×H chip (EditorLayout)", () => {
  it("clears selection and activates the Design tab so Canvas settings show", () => {
    const onCanvasSettingsOpen = vi.fn();

    function ChipHarness() {
      const [tab, setTab] = useState<"design" | "animate" | "export">("animate");
      return (
        <EditorLayout
          frameSize={{ width: 800, height: 200 }}
          isProjectActive
          activeRightTab={tab}
          onRightTabChange={setTab}
          onCanvasSettingsOpen={onCanvasSettingsOpen}
        >
          <div />
        </EditorLayout>
      );
    }

    render(
      <MemoryRouter>
        <EditorProvider
          initial={{
            layers: [shapeLayer("l1")],
            isProjectActive: true,
            frameSize: { width: 800, height: 200 },
          }}
        >
          <ChipHarness />
        </EditorProvider>
      </MemoryRouter>,
    );

    // Start on the Animate tab (its no-selection browse view is showing).
    expect(screen.getByText("No Layer Selected")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /800.*200/ }));

    expect(onCanvasSettingsOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("No Layer Selected")).toBeNull();
    expect(screen.getByText("Canvas")).toBeDefined();
    expect(screen.getByLabelText("Canvas width")).toBeDefined();
  });
});
