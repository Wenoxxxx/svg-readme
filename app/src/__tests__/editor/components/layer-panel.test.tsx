import { useCallback, useState, type ComponentProps, type Dispatch, type SetStateAction } from "react";
import { describe, it, expect, vi } from "vitest";
import { createEvent, render, screen, fireEvent, within } from "@testing-library/react";
import LayerPanel from "../../../components/editor-sidebar/LayerPanel";
import type { LayerType } from "../../../context/EditorContext";

function makeLayer(overrides: Partial<LayerType> & { id: string }): LayerType {
  return {
    name: `Layer ${overrides.id}`,
    type: "shape",
    locked: false,
    visible: true,
    parentId: null,
    ...overrides,
  };
}

/** jsdom reports zero-height rects; give a row a real box for the drop zones. */
function rowBox(height: number): DOMRect {
  return {
    top: 0,
    bottom: height,
    left: 0,
    right: 200,
    width: 200,
    height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

/** Minimal `DataTransfer` stand-in for the HTML5 drag events. */
function makeDragData() {
  return {
    setData: vi.fn(),
    setDragImage: vi.fn(),
    effectAllowed: "move",
    dropEffect: "",
  };
}

/**
 * jsdom has no `DragEvent`, so `fireEvent.dragOver(..., { clientY })` silently
 * drops the pointer position (the handler then sees `undefined`). Build the
 * event explicitly and stamp `clientY` onto it.
 */
function fireDragOver(el: Element, clientY: number, dataTransfer: unknown) {
  const event = createEvent.dragOver(el, { dataTransfer });
  Object.defineProperty(event, "clientY", { value: clientY, configurable: true });
  fireEvent(el, event);
}

/**
 * Stateful harness: LayerPanel is a controlled component, so the parent must
 * actually apply setLayers updates for re-renders to reflect the new state.
 * Real parent state (rather than a rerender spy) means updates dispatched from
 * the panel's own effects — e.g. auto-expanding a selected layer's ancestors —
 * flush exactly like they do in the app.
 */
function renderPanel(
  initialLayers: LayerType[],
  extraProps: Partial<ComponentProps<typeof LayerPanel>> = {},
) {
  const props = {
    onAdd: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onReorder: vi.fn(),
    ...extraProps,
  };
  const holder: { layers: LayerType[] } = { layers: initialLayers };

  function Harness() {
    const [layers, setLayers] = useState(initialLayers);
    holder.layers = layers;
    const dispatch = useCallback<Dispatch<SetStateAction<LayerType[]>>>(
      (updater) =>
        setLayers((prev) =>
          typeof updater === "function"
            ? (updater as (p: LayerType[]) => LayerType[])(prev)
            : updater,
        ),
      [],
    );
    return <LayerPanel layers={layers} setLayers={dispatch} {...props} />;
  }

  const utils = render(<Harness />);
  return { latest: () => holder.layers, ...utils };
}

/** Ids of the layers the panel currently marks as selected. */
function activeIds(layers: LayerType[]): string[] {
  return layers.filter((l) => l.active === true).map((l) => l.id);
}

/** Flatten the layers + children fixture: root text, a group with two children. */
function fixtureLayers(): LayerType[] {
  return [
    makeLayer({ id: "bg", name: "Background", type: "shape" }),
    makeLayer({ id: "group-1", name: "Logo", type: "group" }),
    makeLayer({ id: "child-1", name: "Circle", type: "shape", parentId: "group-1" }),
    makeLayer({ id: "child-2", name: "Star", type: "shape", parentId: "group-1" }),
    makeLayer({ id: "footer", name: "Footer Text", type: "text" }),
  ];
}

describe("LayerPanel — search/filter", () => {
  it("filters layers by name (case-insensitive)", () => {
    renderPanel(fixtureLayers());
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "star" } });
    expect(screen.getByText("Star")).toBeTruthy();
    expect(screen.queryByText("Background")).toBeNull();
    expect(screen.queryByText("Footer Text")).toBeNull();
  });

  it("clears the filter back to all layers", () => {
    renderPanel(fixtureLayers());
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "star" } });
    expect(screen.queryByText("Background")).toBeNull();
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("Background")).toBeTruthy();
    expect(screen.getByText("Footer Text")).toBeTruthy();
  });
});

describe("LayerPanel — child count badge", () => {
  it("shows a child count badge on groups", () => {
    renderPanel(fixtureLayers());
    const logoRow = screen.getByText("Logo").closest("li");
    expect(logoRow).toBeTruthy();
    expect(within(logoRow!).getByText("2")).toBeTruthy();
  });

  it("does not show a badge on leaf layers", () => {
    renderPanel(fixtureLayers());
    const bgRow = screen.getByText("Background").closest("li");
    expect(bgRow).toBeTruthy();
    expect(within(bgRow!).queryByText(/\d/)).toBeNull();
  });
});

describe("LayerPanel — collapse-all / expand-all", () => {
  it("collapses all groups", () => {
    renderPanel(fixtureLayers());
    const btn = screen.getByTitle(/collapse all/i);
    fireEvent.click(btn);
    // Children of the group should be hidden
    expect(screen.queryByText("Circle")).toBeNull();
    expect(screen.queryByText("Star")).toBeNull();
    // Root layers remain
    expect(screen.getByText("Background")).toBeTruthy();
    expect(screen.getByText("Footer Text")).toBeTruthy();
  });

  it("expands all groups after collapsing", () => {
    renderPanel(fixtureLayers());
    fireEvent.click(screen.getByTitle(/collapse all/i));
    expect(screen.queryByText("Circle")).toBeNull();
    fireEvent.click(screen.getByTitle(/expand all/i));
    expect(screen.getByText("Circle")).toBeTruthy();
    expect(screen.getByText("Star")).toBeTruthy();
  });
});

describe("LayerPanel — show/hide all", () => {
  it("hides all layers", () => {
    const { latest } = renderPanel(fixtureLayers());
    fireEvent.click(screen.getByTitle(/hide all/i));
    expect(latest().every((l) => l.visible === false)).toBe(true);
  });

  it("shows all layers again", () => {
    const { latest } = renderPanel(fixtureLayers());
    fireEvent.click(screen.getByTitle(/hide all/i));
    fireEvent.click(screen.getByTitle(/show all/i));
    expect(latest().every((l) => l.visible === true)).toBe(true);
  });
});

describe("LayerPanel — lock all", () => {
  it("locks all layers", () => {
    const { latest } = renderPanel(fixtureLayers());
    fireEvent.click(screen.getByTitle("Lock all layers"));
    expect(latest().every((l) => l.locked === true)).toBe(true);
  });

  it("unlocks all layers", () => {
    const { latest } = renderPanel(fixtureLayers());
    fireEvent.click(screen.getByTitle("Lock all layers"));
    fireEvent.click(screen.getByTitle("Unlock all layers"));
    expect(latest().every((l) => l.locked === false)).toBe(true);
  });
});

describe("LayerPanel — auto-expand on hover", () => {
  it("expands a collapsed group when dragging over it", () => {
    const { latest } = renderPanel(
      fixtureLayers().map((l) =>
        l.id === "group-1" ? { ...l, collapsed: true } : l,
      ),
    );
    // Circle/Star hidden because group collapsed
    expect(screen.queryByText("Circle")).toBeNull();

    const logoRow = screen.getByText("Logo").closest("li")!;
    const dragData = {
      setData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: "move",
      dropEffect: "",
    };
    fireEvent.dragStart(screen.getByText("Background").closest("li")!, {
      dataTransfer: dragData,
    });
    // jsdom reports zero-height rects, so give the row a real box: 90px tall,
    // and hover at 45px → middle third → make-child.
    logoRow.getBoundingClientRect = () => rowBox(90);
    fireDragOver(logoRow, 45, dragData);

    const group = latest().find((l) => l.id === "group-1");
    expect(group?.collapsed).toBe(false);
  });
});

describe("LayerPanel — drag & drop instructions", () => {
  /** Fixture rows are 32px tall; the third-based zones are ~10.7 / ~21.3px. */
  const ROW_HEIGHT = 32;

  /** Fire the drag lifecycle for a drag of `sourceName` onto/over `targetName`. */
  function drag(sourceName: string, targetName: string, clientY: number) {
    const dataTransfer = makeDragData();
    const sourceRow = screen.getByText(sourceName).closest("li")!;
    const targetRow = screen.getByText(targetName).closest("li")!;
    targetRow.getBoundingClientRect = () => rowBox(ROW_HEIGHT);

    fireEvent.dragStart(sourceRow, { dataTransfer });
    fireDragOver(targetRow, clientY, dataTransfer);
    const instruction = targetRow.getAttribute("data-drop-instruction");
    fireEvent.drop(screen.getByText(targetName).closest("li")!, { dataTransfer });
    return instruction;
  }

  it("shows a reorder-above indicator and slots the layer above the target", () => {
    const onReorder = vi.fn();
    const { latest } = renderPanel(fixtureLayers(), { onReorder });

    // "Footer Text" dragged onto the top third of "Background".
    const instruction = drag("Footer Text", "Background", 4);

    expect(instruction).toBe("reorder-above");
    expect(latest().map((l) => l.id)).toEqual([
      "footer",
      "bg",
      "group-1",
      "child-1",
      "child-2",
    ]);
    expect(onReorder).toHaveBeenCalledTimes(1);
  });

  it("shows a reorder-below indicator and slots the layer below the target", () => {
    const { latest } = renderPanel(fixtureLayers());

    // "Background" dragged onto the bottom third of the "Logo" group row.
    const instruction = drag("Background", "Logo", ROW_HEIGHT - 2);

    expect(instruction).toBe("reorder-below");
    expect(latest().map((l) => l.id)).toEqual([
      "group-1",
      "child-1",
      "child-2",
      "bg",
      "footer",
    ]);
  });

  it("shows a make-child indicator and re-parents into the group", () => {
    const { latest } = renderPanel(fixtureLayers());

    // Middle third of a container row → make-child.
    const instruction = drag("Background", "Logo", 16);

    expect(instruction).toBe("make-child");
    const moved = latest().find((l) => l.id === "bg");
    expect(moved?.parentId).toBe("group-1");
  });

  it("rejects dropping a layer into its own descendant", () => {
    const onReorder = vi.fn();
    const { latest } = renderPanel(fixtureLayers(), { onReorder });
    const before = latest().map((l) => l.id);

    // "Logo" (§ a group) over its own child "Circle".
    const instruction = drag("Logo", "Circle", 4);

    expect(instruction).toBeNull();
    expect(latest().map((l) => l.id)).toEqual(before);
    expect(latest().find((l) => l.id === "group-1")?.parentId).toBeNull();
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe("LayerPanel — row shell state", () => {
  it("stamps data-selected on the active row", () => {
    renderPanel(fixtureLayers());
    const bg = screen.getByText("Background").closest("li")!;
    expect(bg.getAttribute("data-selected")).toBe("false");

    fireEvent.click(screen.getByText("Background"));
    expect(bg.getAttribute("data-selected")).toBe("true");
  });

  it("stamps data-hidden on an invisible layer", () => {
    renderPanel(
      fixtureLayers().map((l) =>
        l.id === "footer" ? { ...l, visible: false } : l,
      ),
    );
    expect(
      screen.getByText("Footer Text").closest("li")!.getAttribute("data-hidden"),
    ).toBe("true");
  });

  it("stamps data-dragging and data-drop-position during a drag", () => {
    renderPanel(fixtureLayers());
    const dataTransfer = makeDragData();
    const sourceRow = screen.getByText("Footer Text").closest("li")!;
    const targetRow = screen.getByText("Background").closest("li")!;
    targetRow.getBoundingClientRect = () => rowBox(32);

    fireEvent.dragStart(sourceRow, { dataTransfer });
    fireDragOver(targetRow, 4, dataTransfer);

    expect(sourceRow.getAttribute("data-dragging")).toBe("true");
    expect(targetRow.getAttribute("data-drop-position")).toBe("above");
  });
});

describe("LayerPanel — selection semantics", () => {
  /** Root A, a collapsed group with a hidden child, then Root B. */
  function selectionFixture(): LayerType[] {
    return [
      makeLayer({ id: "root-a", name: "Root A" }),
      makeLayer({
        id: "group-1",
        name: "Collapsed Group",
        type: "group",
        collapsed: true,
      }),
      makeLayer({ id: "child-1", name: "Hidden Child", parentId: "group-1" }),
      makeLayer({ id: "root-b", name: "Root B" }),
    ];
  }

  const visibleIds = ["root-a", "group-1", "root-b"];

  it("click replaces the selection and reports it to the editor", () => {
    const onSelectionChange = vi.fn();
    const { latest } = renderPanel(selectionFixture(), { onSelectionChange });

    fireEvent.click(screen.getByText("Root A"));
    expect(activeIds(latest())).toEqual(["root-a"]);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["root-a"]);

    fireEvent.click(screen.getByText("Root B"));
    expect(activeIds(latest())).toEqual(["root-b"]);
  });

  it("Ctrl/Cmd+click toggles a row in and out of the selection", () => {
    const onSelectionChange = vi.fn();
    const { latest } = renderPanel(selectionFixture(), { onSelectionChange });

    fireEvent.click(screen.getByText("Root A"));
    fireEvent.click(screen.getByText("Root B"), { ctrlKey: true });
    expect(activeIds(latest()).sort()).toEqual(["root-a", "root-b"]);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["root-a", "root-b"]);

    fireEvent.click(screen.getByText("Root A"), { ctrlKey: true });
    expect(activeIds(latest())).toEqual(["root-b"]);
  });

  it("Shift+click selects the visible range and skips collapsed descendants", () => {
    const { latest } = renderPanel(selectionFixture());

    fireEvent.click(screen.getByText("Root A"));
    fireEvent.click(screen.getByText("Root B"), { shiftKey: true });

    // `child-1` sits inside the collapsed group, so it is never part of the range.
    expect(activeIds(latest())).toEqual(visibleIds);
  });

  it("keeps the anchor across consecutive Shift+clicks", () => {
    const { latest } = renderPanel(selectionFixture());

    fireEvent.click(screen.getByText("Root A"));
    fireEvent.click(screen.getByText("Root B"), { shiftKey: true });
    // Range is re-sliced from the original anchor, not from the last row clicked.
    fireEvent.click(screen.getByText("Root B"), { shiftKey: true });
    expect(activeIds(latest())).toEqual(visibleIds);

    // Shrinking the range from the same anchor drops the far end of the slice.
    fireEvent.click(screen.getByText("Collapsed Group"), { shiftKey: true });
    expect(activeIds(latest())).toEqual(["root-a", "group-1"]);
  });

  it("expands collapsed ancestors of an external selection and scrolls the row into view", () => {
    const scrollIntoView = vi.fn();
    // jsdom does not implement scrolling; the panel feature-detects the method.
    Element.prototype.scrollIntoView = scrollIntoView;

    try {
      const layers = selectionFixture().map((l) =>
        l.id === "child-1" ? { ...l, active: true } : l,
      );
      renderPanel(layers);

      // The collapsed group was expanded so the selected child became reachable.
      expect(screen.getByText("Hidden Child")).toBeTruthy();
      expect(scrollIntoView).toHaveBeenCalled();
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });
});
