import { useState, type Dispatch, type SetStateAction } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import LayerPanel from "../../../components/editor-sidebar/LayerPanel";
import {
  LAYER_TREE_ROW_HEIGHT,
  LAYER_TREE_OVERSCAN,
} from "../../../components/editor-sidebar/LayerPanel/geometry";
import { useRowVirtualizer } from "../../../components/editor-sidebar/LayerPanel/useRowVirtualizer";
import type { LayerType } from "../../../context/EditorContext";

// ─── Fixtures / jsdom viewport fakes ──────────────────────────────────────────
//
// jsdom performs no layout: every element reports `clientHeight === 0` and
// ignores `scrollTop`. These helpers give a test a real viewport so the
// virtualization maths can be exercised for real instead of falling back to
// "render everything" (which is what the unmeasured path is tested for below).

const LARGE_COUNT = 2000;
const VIEWPORT_HEIGHT = 320;

function makeLayers(count: number, activeId?: string): LayerType[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `layer-${index}`,
    name: `Layer ${index}`,
    type: "shape" as const,
    locked: false,
    visible: true,
    parentId: null,
    ...(activeId === `layer-${index}` ? { active: true } : {}),
  }));
}

/** Fake `clientHeight` for every element, restored by `afterEach`. */
function mockClientHeight(height: number) {
  const original = Object.getOwnPropertyDescriptor(Element.prototype, "clientHeight");
  Object.defineProperty(Element.prototype, "clientHeight", {
    configurable: true,
    get: () => height,
  });
  return () => {
    if (original) Object.defineProperty(Element.prototype, "clientHeight", original);
  };
}

/** A writable `scrollTop` on one element (jsdom's setter is inert). */
function mockScrollTop(el: Element) {
  let scrollTop = 0;
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
  });
  return {
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
  };
}

/** Detached scroller for the headless hook tests. */
function fakeScroller(height = VIEWPORT_HEIGHT, scrollTop = 0) {
  const el = document.createElement("div");
  let top = scrollTop;
  Object.defineProperty(el, "clientHeight", { configurable: true, get: () => height });
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = value;
    },
  });
  return { el, setScrollTop: (value: number) => (top = value) };
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function scrollViewport(extra?: Partial<{ scrollIntoView: typeof Element.prototype.scrollIntoView }>) {
  const restore = mockClientHeight(VIEWPORT_HEIGHT);
  cleanups.push(restore);
  if (extra?.scrollIntoView) {
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = extra.scrollIntoView;
    cleanups.push(() => {
      Element.prototype.scrollIntoView = original;
    });
  }
}

// ─── useRowVirtualizer ────────────────────────────────────────────────────────

describe("useRowVirtualizer", () => {
  it("renders every row while the viewport has no measurable height", () => {
    const { result } = renderHook(() => useRowVirtualizer({ count: LARGE_COUNT }));

    expect(result.current.measured).toBe(false);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(LARGE_COUNT - 1);
    expect(result.current.totalHeight).toBe(LARGE_COUNT * LAYER_TREE_ROW_HEIGHT);
    // Nothing to scroll to yet — the caller must fall back to DOM scrolling.
    expect(result.current.scrollToIndex(1500)).toBe(false);
  });

  it("windows the rows around the scroll offset once measured", () => {
    const { result } = renderHook(() =>
      useRowVirtualizer({ count: LARGE_COUNT, overscan: 2 }),
    );
    const { el, setScrollTop } = fakeScroller();

    act(() => {
      result.current.scrollRef.current = el;
    });
    act(() => result.current.onScroll());

    expect(result.current.measured).toBe(true);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(10 + 2); // 320px viewport = 10 rows

    setScrollTop(3200); // Row 100 at the top of the viewport.
    act(() => result.current.onScroll());

    expect(result.current.startIndex).toBe(100 - 2);
    expect(result.current.endIndex).toBe(110 + 2);
  });

  it("scrolls a row into view from any align mode and clamps to the list ends", () => {
    const { result } = renderHook(() =>
      useRowVirtualizer({ count: LARGE_COUNT, overscan: 0 }),
    );
    const { el } = fakeScroller();

    act(() => {
      result.current.scrollRef.current = el;
    });
    act(() => result.current.onScroll());

    const rowTop = 100 * LAYER_TREE_ROW_HEIGHT;
    const maxScroll = LARGE_COUNT * LAYER_TREE_ROW_HEIGHT - VIEWPORT_HEIGHT;
    /** Rolling to an index re-renders the window, so keep it inside `act`. */
    const scrollTo = (index: number, align: "auto" | "center" | "end" | "start") => {
      let scrolled = false;
      act(() => {
        scrolled = result.current.scrollToIndex(index, { align });
      });
      return scrolled;
    };

    expect(scrollTo(100, "start")).toBe(true);
    expect(el.scrollTop).toBe(rowTop);

    expect(scrollTo(100, "center")).toBe(true);
    expect(el.scrollTop).toBe(rowTop - (VIEWPORT_HEIGHT - LAYER_TREE_ROW_HEIGHT) / 2);

    expect(scrollTo(100, "end")).toBe(true);
    expect(el.scrollTop).toBe(rowTop + LAYER_TREE_ROW_HEIGHT - VIEWPORT_HEIGHT);

    // `auto` pulls the row to the nearest edge, and never past either end.
    expect(scrollTo(0, "auto")).toBe(true);
    expect(el.scrollTop).toBe(0);
    expect(scrollTo(LARGE_COUNT - 1, "start")).toBe(true);
    expect(el.scrollTop).toBe(maxScroll);

    let outOfRange = true;
    act(() => {
      outOfRange = result.current.scrollToIndex(LARGE_COUNT);
    });
    expect(outOfRange).toBe(false);
  });

  it("clamps the scroll offset when the list shrinks", () => {
    const { result, rerender } = renderHook(
      ({ count }: { count: number }) => useRowVirtualizer({ count, overscan: 0 }),
      { initialProps: { count: LARGE_COUNT } },
    );
    const { el } = fakeScroller();

    act(() => {
      result.current.scrollRef.current = el;
    });
    act(() => result.current.onScroll());
    act(() => {
      result.current.scrollToIndex(LARGE_COUNT - 1, { align: "start" });
    });
    expect(el.scrollTop).toBe(LARGE_COUNT * LAYER_TREE_ROW_HEIGHT - VIEWPORT_HEIGHT);

    rerender({ count: 100 });

    expect(el.scrollTop).toBe(100 * LAYER_TREE_ROW_HEIGHT - VIEWPORT_HEIGHT);
    expect(result.current.endIndex).toBe(99);
  });
});

// ─── LayerPanel ───────────────────────────────────────────────────────────────

function Harness({ initial }: { initial: LayerType[] }) {
  const [layers, setLayers] = useState(initial);
  return (
    <LayerPanel
      layers={layers}
      setLayers={setLayers as Dispatch<SetStateAction<LayerType[]>>}
    />
  );
}

function renderLargePanel(activeId?: string) {
  return render(<Harness initial={makeLayers(LARGE_COUNT, activeId)} />);
}

function scrollerOf(container: HTMLElement): HTMLElement {
  const scroller = container.querySelector('[data-testid="layers-scroll"]');
  if (!(scroller instanceof HTMLElement)) throw new Error("layers scroll viewport missing");
  return scroller;
}

describe("LayerPanel — virtualization", () => {
  // Rendering the 2000-layer fixture is fast in isolation but can exceed the
  // default 5s when the full suite runs the files in parallel, so these three
  // tests carry an explicit budget instead of hanging the whole run.
  const VIRTUALIZED_TEST_TIMEOUT = 15_000;

  it("mounts only the visible window of a 2000-layer document", () => {
    scrollViewport();
    const { container } = renderLargePanel();

    const mounted = container.querySelectorAll("li").length;
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThanOrEqual(20 + LAYER_TREE_OVERSCAN);

    // The list container still spans every row, so the scrollbar is honest.
    const list = container.querySelector("ul");
    expect(list?.style.height).toBe(`${LARGE_COUNT * LAYER_TREE_ROW_HEIGHT}px`);

    expect(screen.getByText("Layer 0")).toBeTruthy();
    expect(screen.queryByText(`Layer ${LARGE_COUNT - 1}`)).toBeNull();
  }, VIRTUALIZED_TEST_TIMEOUT);

  it("mounts the rows around the new offset when the viewport scrolls", () => {
    scrollViewport();
    const { container } = renderLargePanel();
    const scroller = scrollerOf(container);
    const scrollTop = mockScrollTop(scroller);

    scrollTop.set(LARGE_COUNT * LAYER_TREE_ROW_HEIGHT - VIEWPORT_HEIGHT);
    act(() => {
      fireEvent.scroll(scroller);
    });

    expect(screen.getByText(`Layer ${LARGE_COUNT - 1}`)).toBeTruthy();
    expect(screen.queryByText("Layer 0")).toBeNull();
  }, VIRTUALIZED_TEST_TIMEOUT);

  it("scrolls a selected row that is outside the window into view by index", () => {
    const scrollIntoView = vi.fn();
    scrollViewport({ scrollIntoView });
    const deepId = `layer-${LARGE_COUNT - 1}`;

    renderLargePanel(deepId);

    // The selected row was never mounted before the scroll, so the panel had to
    // go through `scrollToIndex` rather than the DOM fallback.
    expect(screen.getByText(`Layer ${LARGE_COUNT - 1}`)).toBeTruthy();
    expect(screen.queryByText("Layer 0")).toBeNull();
    expect(scrollIntoView).not.toHaveBeenCalled();
  }, VIRTUALIZED_TEST_TIMEOUT);
});
