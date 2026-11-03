import { useCallback, useState, type ComponentProps, type Dispatch, type SetStateAction } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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

function fixture(): LayerType[] {
  return [
    makeLayer({ id: "bg", name: "Background" }),
    makeLayer({ id: "group-1", name: "Logo", type: "group", collapsed: false }),
    makeLayer({ id: "child-1", name: "Circle", parentId: "group-1" }),
    makeLayer({ id: "footer", name: "Footer" }),
  ];
}

function renderPanel(extraProps: Partial<ComponentProps<typeof LayerPanel>> = {}) {
  const onBeforeMutation = vi.fn();
  const holder: { layers: LayerType[] } = { layers: fixture() };

  function Harness() {
    const [layers, setLayers] = useState(holder.layers);
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
    return (
      <LayerPanel
        layers={layers}
        setLayers={dispatch}
        onBeforeMutation={onBeforeMutation}
        {...extraProps}
      />
    );
  }

  render(<Harness />);
  return { latest: () => holder.layers, onBeforeMutation };
}

const rowOf = (name: string) => screen.getByText(name).closest("li")!;

describe("LayerPanel — undoable edits", () => {
  it("records one history step per eye / lock toggle", () => {
    const { latest, onBeforeMutation } = renderPanel();

    fireEvent.click(within(rowOf("Footer")).getByTitle("Hide Layer"));
    expect(onBeforeMutation).toHaveBeenCalledTimes(1);
    expect(latest().find((l) => l.id === "footer")?.visible).toBe(false);

    fireEvent.click(within(rowOf("Footer")).getByTitle("Lock Layer"));
    expect(onBeforeMutation).toHaveBeenCalledTimes(2);
    expect(latest().find((l) => l.id === "footer")?.locked).toBe(true);
  });

  it("does not record history for collapse / expand", () => {
    const { latest, onBeforeMutation } = renderPanel();
    // The disclosure caret is the first button in a group row.
    fireEvent.click(within(rowOf("Logo")).getAllByRole("button")[0]);
    expect(latest().find((l) => l.id === "group-1")?.collapsed).toBe(true);
    expect(onBeforeMutation).not.toHaveBeenCalled();
  });

  it("routes the row trash through the editor's delete path", () => {
    const onDeleteLayer = vi.fn();
    const { latest, onBeforeMutation } = renderPanel({ onDeleteLayer });

    fireEvent.click(within(rowOf("Logo")).getByTitle("Delete Layer"));
    expect(onDeleteLayer).toHaveBeenCalledWith("group-1");
    // The editor owns the mutation (and its history step).
    expect(latest()).toHaveLength(4);
    expect(onBeforeMutation).not.toHaveBeenCalled();
  });

  it("falls back to deleting the row with its descendants", () => {
    const { latest, onBeforeMutation } = renderPanel();
    fireEvent.click(within(rowOf("Logo")).getByTitle("Delete Layer"));
    expect(latest().map((l) => l.id)).toEqual(["bg", "footer"]);
    expect(onBeforeMutation).toHaveBeenCalledTimes(1);
  });

  it("delegates Add Layer / Add Group to the editor when wired", () => {
    const onAddLayer = vi.fn();
    const onAddGroup = vi.fn();
    renderPanel({ onAddLayer, onAddGroup });
    fireEvent.click(screen.getByTitle(/add layer/i));
    fireEvent.click(screen.getByTitle(/add group/i));
    expect(onAddLayer).toHaveBeenCalledTimes(1);
    expect(onAddGroup).toHaveBeenCalledTimes(1);
  });
});

describe("LayerPanel — rename", () => {
  function startRename(name: string): HTMLInputElement {
    fireEvent.doubleClick(screen.getByText(name));
    return screen.getByDisplayValue(name) as HTMLInputElement;
  }

  it("commits on Enter as a single undo step (the trailing blur is a no-op)", () => {
    const onRename = vi.fn();
    const { latest, onBeforeMutation } = renderPanel({ onRename });
    const input = startRename("Footer");
    fireEvent.change(input, { target: { value: "Footer Text" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);

    expect(latest().find((l) => l.id === "footer")?.name).toBe("Footer Text");
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onBeforeMutation).toHaveBeenCalledTimes(1);
  });

  it("commits on blur", () => {
    const { latest } = renderPanel();
    const input = startRename("Footer");
    fireEvent.change(input, { target: { value: "Bottom" } });
    fireEvent.blur(input);
    expect(latest().find((l) => l.id === "footer")?.name).toBe("Bottom");
  });

  it("cancels on Escape, even when a blur follows", () => {
    const { latest, onBeforeMutation } = renderPanel();
    const input = startRename("Footer");
    fireEvent.change(input, { target: { value: "Nope" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(latest().find((l) => l.id === "footer")?.name).toBe("Footer");
    expect(onBeforeMutation).not.toHaveBeenCalled();
  });

  it("reverts an empty name instead of renaming", () => {
    const { latest, onBeforeMutation } = renderPanel();
    const input = startRename("Footer");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(latest().find((l) => l.id === "footer")?.name).toBe("Footer");
    expect(onBeforeMutation).not.toHaveBeenCalled();
  });
});
