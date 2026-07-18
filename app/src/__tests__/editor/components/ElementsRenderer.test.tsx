import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ElementsRenderer from "../../../components/editor-canvas/ElementsRenderer";
import type { TextElementProperties, LayerType } from "../../../context/EditorContext";

/** Factory for a minimal text layer */
function makeLayer(id: string, overrides?: Partial<LayerType>): LayerType {
  return {
    id,
    name: `Layer ${id}`,
    type: "text",
    locked: false,
    visible: true,
    active: false,
    ...overrides,
  };
}

/** Factory for text element properties */
function makeTextProps(
  overrides?: Partial<TextElementProperties>
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
//  ElementsRenderer — Rendering behavior (Figma reference)
// ═══════════════════════════════════════════════════════════════════════════════

describe("ElementsRenderer — selection highlights (Figma reference)", () => {
  // Figma: Selected layer shows a blue bounding box (stroke #3b82f6)
  it("renders blue selection rect when layer is selected", () => {
    const layers = [makeLayer("layer-1")];
    const elementProps = { "layer-1": makeTextProps() };

    const { container } = render(
      <svg>
        <ElementsRenderer
          layers={layers}
          elementProperties={elementProps}
          selectedLayerId="layer-1"
          editingLayerId={null}
          onElementMouseDown={() => {}}
          onElementDoubleClick={() => {}}
        />
      </svg>
    );

    const selectionRect = container.querySelector("rect[stroke='#3b82f6']");
    expect(selectionRect).toBeTruthy();
  });

  // Figma: When editing text, the selection highlight is hidden
  it("hides selection rect when layer is being edited", () => {
    const layers = [makeLayer("layer-1")];
    const elementProps = { "layer-1": makeTextProps() };

    const { container } = render(
      <svg>
        <ElementsRenderer
          layers={layers}
          elementProperties={elementProps}
          selectedLayerId="layer-1"
          editingLayerId="layer-1"
          onElementMouseDown={() => {}}
          onElementDoubleClick={() => {}}
        />
      </svg>
    );

    const selectionRect = container.querySelector("rect[stroke='#3b82f6']");
    expect(selectionRect).toBeFalsy();
  });

  // Figma: The SVG text content is hidden while editing (TextOverlay handles display)
  it("hides SVG text content when editing", () => {
    const layers = [makeLayer("layer-1")];
    const elementProps = { "layer-1": makeTextProps({ content: "Hello" }) };

    const { container } = render(
      <svg>
        <ElementsRenderer
          layers={layers}
          elementProperties={elementProps}
          selectedLayerId="layer-1"
          editingLayerId="layer-1"
          onElementMouseDown={() => {}}
          onElementDoubleClick={() => {}}
        />
      </svg>
    );

    const textElement = container.querySelector("text");
    expect(textElement).toBeFalsy();
  });

  // Figma: The SVG text content is visible when not editing
  it("shows SVG text content when not editing", () => {
    const layers = [makeLayer("layer-1")];
    const elementProps = { "layer-1": makeTextProps({ content: "Hello" }) };

    const { container } = render(
      <svg>
        <ElementsRenderer
          layers={layers}
          elementProperties={elementProps}
          selectedLayerId={null}
          editingLayerId={null}
          onElementMouseDown={() => {}}
          onElementDoubleClick={() => {}}
        />
      </svg>
    );

    const textElement = container.querySelector("text");
    expect(textElement).toBeTruthy();
    expect(textElement?.textContent).toBe("Hello");
  });

  // Figma: Invisible hit area exists (no cursor-pointer class override)
  it("renders transparent hit rect without cursor-pointer override", () => {
    const layers = [makeLayer("layer-1")];
    const elementProps = { "layer-1": makeTextProps() };

    const { container } = render(
      <svg>
        <ElementsRenderer
          layers={layers}
          elementProperties={elementProps}
          selectedLayerId={null}
          editingLayerId={null}
          onElementMouseDown={() => {}}
          onElementDoubleClick={() => {}}
        />
      </svg>
    );

    const hitRect = container.querySelector("rect[fill='transparent']");
    expect(hitRect).toBeTruthy();
    expect(hitRect?.getAttribute("class")).not.toBe("cursor-pointer");
  });

  // Figma: Only visible layers are rendered
  it("does not render hidden layers", () => {
    const layers = [makeLayer("layer-1", { visible: false })];
    const elementProps = { "layer-1": makeTextProps() };

    const { container } = render(
      <svg>
        <ElementsRenderer
          layers={layers}
          elementProperties={elementProps}
          selectedLayerId={null}
          editingLayerId={null}
          onElementMouseDown={() => {}}
          onElementDoubleClick={() => {}}
        />
      </svg>
    );

    const textElement = container.querySelector("text");
    expect(textElement).toBeFalsy();
  });
});
