import { clampZoom, zoomAtPoint } from "../editor/geometry";
import type { Viewport } from "../editor/geometry";
import type React from "react";

/**
 * Start a pan interaction.
 */
export function startPan(
  event: React.MouseEvent,
  viewport: Viewport,
): { panState: { startX: number; startY: number; initialPanX: number; initialPanY: number } } {
  return {
    panState: {
      startX: event.clientX,
      startY: event.clientY,
      initialPanX: viewport.panX,
      initialPanY: viewport.panY,
    },
  };
}

/**
 * Update pan position from mouse movement.
 */
export function updatePan(
  panState: { startX: number; startY: number; initialPanX: number; initialPanY: number },
  clientX: number,
  clientY: number,
  viewport: Viewport,
): Viewport {
  return {
    ...viewport,
    panX: panState.initialPanX + clientX - panState.startX,
    panY: panState.initialPanY + clientY - panState.startY,
  };
}

/** The subset of a WheelEvent the canvas wheel handler needs. */
export interface WheelInput {
  deltaX: number;
  deltaY: number;
  /** 0 = pixels, 1 = lines, 2 = pages. */
  deltaMode?: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  clientX: number;
  clientY: number;
}

/** Max |deltaY| (px) honoured per wheel event when zooming — keeps a mouse
 *  wheel notch (~100px) to a ~1.28× step while trackpad pinch stays smooth. */
const MAX_ZOOM_DELTA = 25;
const ZOOM_SENSITIVITY = 0.01;

/**
 * Figma-style wheel handling.
 * - Ctrl/Cmd + wheel, and trackpad pinch (browsers report it as ctrl+wheel),
 *   zooms around the cursor, proportionally to deltaY.
 * - Plain wheel / two-finger scroll pans; Shift + wheel pans horizontally.
 * `svgRect` is the canvas <svg>'s client rect (already offset by the pan).
 */
export function computeWheelViewport(
  event: WheelInput,
  viewport: Viewport,
  svgRect: { left: number; top: number },
): Viewport {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
  const deltaX = event.deltaX * unit;
  const deltaY = event.deltaY * unit;

  if (event.ctrlKey || event.metaKey) {
    const pointer = {
      x: viewport.panX + event.clientX - svgRect.left,
      y: viewport.panY + event.clientY - svgRect.top,
    };
    const clamped = Math.max(-MAX_ZOOM_DELTA, Math.min(MAX_ZOOM_DELTA, deltaY));
    const nextZoom = clampZoom(viewport.zoom * Math.exp(-clamped * ZOOM_SENSITIVITY));
    return zoomAtPoint(viewport, pointer, nextZoom);
  }

  if (event.shiftKey && deltaX === 0) {
    return { ...viewport, panX: viewport.panX - deltaY };
  }
  return { ...viewport, panX: viewport.panX - deltaX, panY: viewport.panY - deltaY };
}

/**
 * Handle wheel zoom, returning the new viewport.
 * @deprecated Use computeWheelViewport (pans on plain wheel, zooms on ctrl/pinch).
 */
export function handleZoom(
  event: React.WheelEvent<SVGSVGElement>,
  viewport: Viewport,
  svgElement: SVGSVGElement,
): Viewport | null {
  const rect = svgElement.getBoundingClientRect();
  if (!rect) return null;

  const pointer = {
    x: viewport.panX + event.clientX - rect.left,
    y: viewport.panY + event.clientY - rect.top,
  };
  const nextZoom = clampZoom(viewport.zoom * (event.deltaY < 0 ? 1.1 : 0.9));
  return zoomAtPoint(viewport, pointer, nextZoom);
}
