import { useCallback, useEffect, useRef, useState } from "react";
import type { LayerTreeVirtualizer } from "../../../lib/editor/layerTree/types";
import { LAYER_TREE_OVERSCAN, LAYER_TREE_ROW_HEIGHT } from "./geometry";

/**
 * Fixed-height row virtualizer.
 *
 * Rows are all the same height (`LAYER_TREE_ROW_HEIGHT`), so the whole list can
 * be addressed by index math instead of by measuring the DOM: content height is
 * `count * rowHeight` and row `i` sits at `i * rowHeight`. That mirrors the
 * upstream `TreeVirtualizer` + `geometry.ts` pairing, which also drives
 * scrolling from a fixed `estimateSize`.
 *
 * The hook owns the `scrollToIndex` contract the selection logic needs
 * (`LayerTreeVirtualizer`) and adds a DOM fallback signal: it returns `false`
 * when the viewport cannot be measured (no layout yet, jsdom) so the caller can
 * fall back to `Element.scrollIntoView`. In that state every row renders, which
 * keeps the panel usable — and testable — without a real viewport.
 */
export interface RowVirtualizer extends LayerTreeVirtualizer {
  /** Attach to the scrolling element whose `clientHeight` bounds the window. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Scroll listener + re-measure hook for the scrolling element. */
  onScroll: () => void;
  /** Height of the full list, applied to the positioning container. */
  totalHeight: number;
  /** Inclusive index range to render (every row while unmeasured). */
  startIndex: number;
  endIndex: number;
  /** True once the viewport has a real height. */
  measured: boolean;
}

export interface RowVirtualizerOptions {
  /** Total number of rows. */
  count: number;
  /** Row height in pixels; must match the row's rendered height. */
  rowHeight?: number;
  /** Rows rendered beyond the window on each side. */
  overscan?: number;
}

export function useRowVirtualizer({
  count,
  rowHeight = LAYER_TREE_ROW_HEIGHT,
  overscan = LAYER_TREE_OVERSCAN,
}: RowVirtualizerOptions): RowVirtualizer {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ height: 0, scrollTop: 0 });

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const next = { height: el.clientHeight, scrollTop: el.scrollTop };
    setViewport((prev) =>
      prev.height === next.height && prev.scrollTop === next.scrollTop
        ? prev
        : next,
    );
  }, []);

  // The panel resizes with the sidebar (and can be mounted while hidden), so
  // the window has to be re-measured when the viewport box changes, not just on
  // mount. jsdom has no ResizeObserver, hence the window-resize fallback.
  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // Re-clamp when the list shrinks (e.g. collapsing every group) so the window
  // never renders past the end of the new list.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, count * rowHeight - el.clientHeight);
    if (el.scrollTop > maxScroll) el.scrollTop = maxScroll;
    measure();
  }, [count, rowHeight, measure]);

  const scrollToIndex = useCallback<LayerTreeVirtualizer["scrollToIndex"]>(
    (index, options) => {
      const el = scrollRef.current;
      if (!el || index < 0 || index >= count) return false;

      const viewportHeight = el.clientHeight;
      // Unmeasurable viewport (jsdom, `display: none`) → let the caller fall
      // back to DOM scrolling rather than scrolling to a nonsense offset.
      if (viewportHeight <= 0) return false;

      const rowTop = index * rowHeight;
      const rowBottom = rowTop + rowHeight;
      const current = el.scrollTop;
      const align = options?.align ?? "auto";

      let next: number | null = null;
      if (align === "start") next = rowTop;
      else if (align === "center") next = rowTop - (viewportHeight - rowHeight) / 2;
      else if (align === "end") next = rowBottom - viewportHeight;
      else if (rowTop < current) next = rowTop;
      else if (rowBottom > current + viewportHeight) next = rowBottom - viewportHeight;

      if (next === null) return true; // Already fully in view.

      const maxScroll = Math.max(0, count * rowHeight - viewportHeight);
      const target = Math.max(0, Math.min(next, maxScroll));
      el.scrollTop = target;
      setViewport((prev) =>
        prev.scrollTop === target ? prev : { ...prev, scrollTop: target },
      );
      return true;
    },
    [count, rowHeight],
  );

  const measured = viewport.height > 0;
  const startIndex = measured
    ? Math.max(0, Math.floor(viewport.scrollTop / rowHeight) - overscan)
    : 0;
  const endIndex = measured
    ? Math.min(
        count - 1,
        Math.ceil((viewport.scrollTop + viewport.height) / rowHeight) + overscan,
      )
    : count - 1;

  return {
    scrollRef,
    onScroll: measure,
    totalHeight: count * rowHeight,
    startIndex,
    endIndex,
    measured,
    scrollToIndex,
  };
}
