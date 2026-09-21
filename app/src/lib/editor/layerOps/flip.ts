import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";

/**
 * Flip the selected layers about their own centre.
 *
 * Mirrors the right-bar flip buttons: the geometry is not rewritten, the
 * `flipH`/`flipV` flags are toggled, and `ElementsRenderer`/the SVG exporter
 * wrap the element in `scale(-1, 1)`/`scale(1, -1)` around its centre. Keeping
 * one representation means the canvas, the export and undo/redo all agree.
 *
 * Only layers with element properties can be mirrored — a group is a container
 * with no geometry of its own, so it is skipped rather than silently flipped as
 * a whole (flip its children instead).
 */

export type FlipAxis = "horizontal" | "vertical";

export function flipLayers(
  elementProperties: Readonly<Record<string, ElementProperties>>,
  selectedLayerIds: readonly string[],
  axis: FlipAxis,
): { updatedProperties: Record<string, ElementProperties> } | null {
  const updatedProperties: Record<string, ElementProperties> = {};

  for (const id of selectedLayerIds) {
    const properties = elementProperties[id];
    if (!properties) continue;

    updatedProperties[id] =
      axis === "horizontal"
        ? { ...properties, flipH: !properties.flipH }
        : { ...properties, flipV: !properties.flipV };
  }

  if (Object.keys(updatedProperties).length === 0) return null;
  return { updatedProperties };
}
