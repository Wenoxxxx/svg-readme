import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useKeyboardShortcuts,
  type KeyboardShortcutHandlers,
} from "../../../pages/editor/hooks/useKeyboardShortcuts";
import type { LayerType } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";

function layer(id: string, overrides?: Partial<LayerType>): LayerType {
  return {
    id,
    name: id,
    type: "shape",
    locked: false,
    visible: true,
    parentId: null,
    ...overrides,
  };
}

const shapeProps: ElementProperties = {
  type: "shape",
  kind: "rect",
  x: 0,
  y: 0,
  width: 20,
  height: 20,
  fill: "#fff",
  stroke: "none",
  strokeWidth: 0,
  opacity: 1,
};

/** Minimal handlers: every shortcut target is a spy, everything else a no-op. */
function makeHandlers(
  overrides: Partial<KeyboardShortcutHandlers> = {},
): KeyboardShortcutHandlers & {
  handleDuplicate: ReturnType<typeof vi.fn>;
  handleGroup: ReturnType<typeof vi.fn>;
  handleUngroup: ReturnType<typeof vi.fn>;
  handleReorderLayers: ReturnType<typeof vi.fn>;
} {
  const handleDuplicate = vi.fn();
  const handleGroup = vi.fn();
  const handleUngroup = vi.fn();
  const handleReorderLayers = vi.fn();
  return {
    isEditingRef: { current: false },
    handleCommitText: vi.fn(),
    handleCopy: vi.fn(),
    handlePaste: vi.fn(),
    handleUndo: vi.fn(),
    handleRedo: vi.fn(),
    handleDuplicate,
    handleReorderLayers,
    handleDeleteSelectedLayers: vi.fn(),
    handleGroup,
    handleUngroup,
    handleSmartDelete: vi.fn(),
    setActiveTool: vi.fn(),
    selectedLayerId: null,
    selectedLayerIds: [],
    setSelectedLayerId: vi.fn(),
    setSelectedLayerIds: vi.fn(),
    setViewport: vi.fn(),
    setGridEnabled: vi.fn(),
    layers: [],
    elementProperties: {},
    ...overrides,
  } as KeyboardShortcutHandlers & {
    handleDuplicate: ReturnType<typeof vi.fn>;
    handleGroup: ReturnType<typeof vi.fn>;
    handleUngroup: ReturnType<typeof vi.fn>;
    handleReorderLayers: ReturnType<typeof vi.fn>;
  };
}

function press(key: string, init: KeyboardEventInit = {}) {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key, ctrlKey: true, ...init }),
  );
}

describe("useKeyboardShortcuts — layer command dispatch", () => {
  it("dispatches Ctrl+D through the registry when a layer is selected", () => {
    const handlers = makeHandlers({
      layers: [layer("a")],
      selectedLayerIds: ["a"],
      selectedLayerId: "a",
    });
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

    press("d");

    expect(handlers.handleDuplicate).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("gates Ctrl+D off when nothing is selected (capability-driven)", () => {
    const handlers = makeHandlers({ layers: [layer("a")] });
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

    press("d");

    expect(handlers.handleDuplicate).not.toHaveBeenCalled();
    unmount();
  });

  it("dispatches Ctrl+G to group only when the selection supports it", () => {
    const groupable = makeHandlers({
      layers: [layer("a"), layer("b")],
      selectedLayerIds: ["a", "b"],
    });
    const first = renderHook(() => useKeyboardShortcuts(groupable));
    press("g");
    expect(groupable.handleGroup).toHaveBeenCalledTimes(1);
    expect(groupable.handleUngroup).not.toHaveBeenCalled();
    first.unmount();

    // A single layer cannot be grouped, so the shortcut is a no-op.
    const single = makeHandlers({
      layers: [layer("a")],
      selectedLayerIds: ["a"],
    });
    const second = renderHook(() => useKeyboardShortcuts(single));
    press("g");
    expect(single.handleGroup).not.toHaveBeenCalled();
    second.unmount();
  });

  it("dispatches Ctrl+Shift+G to ungroup a selected group", () => {
    const handlers = makeHandlers({
      layers: [layer("g", { type: "group" })],
      selectedLayerIds: ["g"],
      elementProperties: { g: shapeProps },
    });
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

    press("g", { shiftKey: true });

    expect(handlers.handleUngroup).toHaveBeenCalledTimes(1);
    expect(handlers.handleGroup).not.toHaveBeenCalled();
    unmount();
  });

  it("dispatches ordering shortcuts through the registry", () => {
    const handlers = makeHandlers({
      layers: [layer("a")],
      selectedLayerIds: ["a"],
    });
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

    press("]");
    expect(handlers.handleReorderLayers).toHaveBeenCalledWith("forward");

    press("]", { shiftKey: true });
    expect(handlers.handleReorderLayers).toHaveBeenCalledWith("front");

    press("[");
    expect(handlers.handleReorderLayers).toHaveBeenCalledWith("backward");

    press("[", { shiftKey: true });
    expect(handlers.handleReorderLayers).toHaveBeenCalledWith("back");

    unmount();
  });
});
