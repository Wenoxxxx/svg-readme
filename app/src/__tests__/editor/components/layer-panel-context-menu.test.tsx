import { useCallback, useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import LayerPanel from "../../../components/editor-sidebar/LayerPanel";
import type { LayerType } from "../../../context/EditorContext";

// ─── Harness ──────────────────────────────────────────────────────────────────

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

/**
 * Stateful harness: the panel is controlled, so the parent has to apply
 * `setLayers` for the selection to round-trip the way it does in the editor.
 */
function renderPanel(
  initialLayers: LayerType[],
  extraProps: Partial<ComponentProps<typeof LayerPanel>> = {},
) {
  const onContextAction = vi.fn();
  const props = { onContextAction, ...extraProps };
  const holder: { layers: LayerType[] } = { layers: initialLayers };

  function Harness() {
    const [layers, setLayers] = useState(initialLayers);
    holder.layers = layers;
    const dispatch = useCallback<React.Dispatch<React.SetStateAction<LayerType[]>>>(
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
  return { onContextAction, latest: () => holder.layers, ...utils };
}

/** Row fixture: a root group with two children, plus a sibling root shape. */
function fixtureLayers(): LayerType[] {
  return [
    makeLayer({ id: "group-1", name: "Logo", type: "group" }),
    makeLayer({ id: "child-1", name: "Circle", parentId: "group-1" }),
    makeLayer({ id: "child-2", name: "Star", parentId: "group-1" }),
    makeLayer({ id: "footer", name: "Footer" }),
  ];
}

/** The menu root: the `div` the label spans live inside. */
function menuRoot(): HTMLElement {
  return screen.getByText("Copy").closest("div") as HTMLElement;
}

/**
 * A row's label without its shortcut: the button's first child is the label
 * group (`[icon?] label`), and the shortcut is rendered as a sibling after it.
 */
function labelOf(button: HTMLElement): string {
  const labelGroup = button.firstElementChild as HTMLElement | null;
  return labelGroup?.lastElementChild?.textContent?.trim() ?? "";
}

/** The menu buttons' labels, in render order. */
function menuLabels(): string[] {
  return within(menuRoot())
    .getAllByRole("button")
    .map(labelOf);
}

function menuButton(label: string): HTMLElement {
  return screen.getByText(label).closest("button")!;
}

function openMenuOn(name: string) {
  fireEvent.contextMenu(screen.getByText(name), { clientX: 40, clientY: 60 });
}

// ─── Opening ──────────────────────────────────────────────────────────────────

describe("LayerPanel — context menu opening", () => {
  it("shows no menu until a row is right-clicked", () => {
    renderPanel(fixtureLayers());
    expect(screen.queryByText("Copy")).toBeNull();
  });

  it("opens the reference menu on right-click", () => {
    renderPanel(fixtureLayers());
    openMenuOn("Circle");

    expect(menuLabels()).toEqual([
      "Copy",
      "Cut",
      "Paste here",
      "Paste to replace",
      "Duplicate",
      "Delete",
      "Bring forward",
      "Bring to front",
      "Send backward",
      "Send to back",
      "Group selection",
      "Frame selection",
      "Add auto layout",
      "Use as mask",
      "Flatten",
      "Outline text",
      "Outline stroke",
      "Create component",
      "Show/Hide",
      "Lock/Unlock",
      "Flip horizontal",
      "Flip vertical",
      "Copy/Paste as",
    ]);
  });

  it("selects the right-clicked layer when it was not selected", () => {
    const { latest } = renderPanel(fixtureLayers());
    openMenuOn("Circle");

    expect(latest().filter((l) => l.active).map((l) => l.id)).toEqual(["child-1"]);
  });

  it("keeps a multi-selection that already contains the clicked row", () => {
    const { latest } = renderPanel(fixtureLayers());

    fireEvent.click(screen.getByText("Circle"));
    fireEvent.click(screen.getByText("Star"), { ctrlKey: true });
    openMenuOn("Star");

    expect(latest().filter((l) => l.active).map((l) => l.id).sort()).toEqual([
      "child-1",
      "child-2",
    ]);
  });
});

// ─── State-driven enablement ──────────────────────────────────────────────────

describe("LayerPanel — menu enablement", () => {
  it("disables Group selection for a single layer but enables it for two", () => {
    renderPanel(fixtureLayers());

    openMenuOn("Circle");
    expect(menuButton("Group selection")).toBeDisabled();
    fireEvent.keyDown(window, { key: "Escape" });

    fireEvent.click(screen.getByText("Circle"));
    fireEvent.click(screen.getByText("Star"), { ctrlKey: true });
    openMenuOn("Star");
    expect(menuButton("Group selection")).not.toBeDisabled();
  });

  it("disables Paste to replace while the clipboard is empty", () => {
    renderPanel(fixtureLayers(), { clipboardCount: 0 });
    openMenuOn("Circle");
    expect(menuButton("Paste to replace")).toBeDisabled();
  });

  it("enables Paste to replace when the clipboard matches the selection size", () => {
    renderPanel(fixtureLayers(), { clipboardCount: 1 });
    openMenuOn("Circle");
    // One layer on the clipboard and one selected → a 1:1 replace fits.
    expect(menuButton("Paste to replace")).not.toBeDisabled();
  });

  it("paints Create component with the accent treatment", () => {
    renderPanel(fixtureLayers());
    openMenuOn("Circle");
    expect(menuButton("Create component").className).toContain("violet");
  });
});

// ─── Dispatch ─────────────────────────────────────────────────────────────────

describe("LayerPanel — menu dispatch", () => {
  it("reports the command id and the anchor layer when a row is clicked", () => {
    const { onContextAction } = renderPanel(fixtureLayers());
    openMenuOn("Footer");

    fireEvent.click(menuButton("Duplicate"));

    expect(onContextAction).toHaveBeenCalledWith("duplicate", "footer");
    // The menu closes after the action.
    expect(screen.queryByText("Duplicate")).toBeNull();
  });

  it("dispatches a multi-selection action against the clicked anchor", () => {
    const { onContextAction } = renderPanel(fixtureLayers());

    fireEvent.click(screen.getByText("Circle"));
    fireEvent.click(screen.getByText("Star"), { ctrlKey: true });
    openMenuOn("Circle");
    fireEvent.click(menuButton("Group selection"));

    expect(onContextAction).toHaveBeenCalledWith("group", "child-1");
  });

  it("does not dispatch a disabled row", () => {
    const { onContextAction } = renderPanel(fixtureLayers());
    openMenuOn("Circle");

    fireEvent.click(menuButton("Group selection"));

    expect(onContextAction).not.toHaveBeenCalled();
  });

  it("opens the Copy/Paste as submenu with the copy commands", () => {
    renderPanel(fixtureLayers());
    openMenuOn("Circle");

    fireEvent.mouseEnter(menuButton("Copy/Paste as"));

    expect(screen.getByText("Copy as PNG")).toBeTruthy();
    expect(screen.getByText("Copy as SVG")).toBeTruthy();
  });

  it("runs a submenu command through the same dispatch", () => {
    const { onContextAction } = renderPanel(fixtureLayers());
    openMenuOn("Circle");

    fireEvent.mouseEnter(menuButton("Copy/Paste as"));
    fireEvent.click(screen.getByText("Copy as SVG").closest("button")!);

    expect(onContextAction).toHaveBeenCalledWith("copyAsSvg", "child-1");
  });
});
