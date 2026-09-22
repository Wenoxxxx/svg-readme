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

    // Reference bindings: the modifiers move the layer one step, the bare key
    // jumps it all the way — Ctrl+] / ] , Ctrl+[ / [.
    press("]");
    expect(handlers.handleReorderLayers).toHaveBeenCalledWith("forward");

    press("]", { ctrlKey: false });
    expect(handlers.handleReorderLayers).toHaveBeenCalledWith("front");

    press("[");
    expect(handlers.handleReorderLayers).toHaveBeenCalledWith("backward");

    press("[", { ctrlKey: false });
    expect(handlers.handleReorderLayers).toHaveBeenCalledWith("back");

    unmount();
  });

  it("binds the reference transform and structure shortcuts", () => {
    const calls: string[] = [];
    const handlers = makeHandlers({
      layers: [layer("a"), layer("b")],
      selectedLayerIds: ["a", "b"],
      elementProperties: { a: shapeProps, b: shapeProps },
      layerCommandHandlers: {
        addAutoLayout: () => calls.push("addAutoLayout"),
        flipHorizontal: () => calls.push("flipHorizontal"),
        flipVertical: () => calls.push("flipVertical"),
        createComponent: () => calls.push("createComponent"),
        toggleVisibility: () => calls.push("toggleVisibility"),
        toggleLock: () => calls.push("toggleLock"),
        group: () => calls.push("group"),
      },
    });
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

    // Shift+A
    press("A", { ctrlKey: false, shiftKey: true });
    // Shift+H / Shift+V — must not be swallowed by the hand / move tools.
    press("H", { ctrlKey: false, shiftKey: true });
    press("V", { ctrlKey: false, shiftKey: true });
    // Ctrl+Alt+K
    press("k", { altKey: true });
    // Ctrl+Shift+H / Ctrl+Shift+L
    press("h", { shiftKey: true });
    press("l", { shiftKey: true });

    expect(calls).toEqual([
      "addAutoLayout",
      "flipHorizontal",
      "flipVertical",
      "createComponent",
      "toggleVisibility",
      "toggleLock",
    ]);
    // Shift+H flips; it must not also switch to the hand tool.
    expect(handlers.setActiveTool).not.toHaveBeenCalled();
    unmount();
  });

  it("keeps Shift+H/V distinct from the hand and move tools", () => {
    const handlers = makeHandlers({ layers: [], selectedLayerIds: [] });
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

    // Plain keys still select the tools.
    press("h", { ctrlKey: false });
    expect(handlers.setActiveTool).toHaveBeenCalledWith("hand");

    press("v", { ctrlKey: false });
    expect(handlers.setActiveTool).toHaveBeenCalledWith("move");
    unmount();
  });
});
