import type { LayerType } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";
import { getElementBoundingBox } from "../../../components/editor-canvas/boundingBox";
import { collectDescendantIds } from "../layerTree/model";
import { translatePoints } from "../pathUtils";

/**
 * Selection-scoped export ("Copy as SVG / PNG / CSS").
 *
 * The export pipeline renders a whole document, so a selection is exported by
 * building a *sub-document*: the selected layers plus their descendants,
 * re-rooted at the top level, translated so the selection's bounding box starts
 * at (0, 0), with a frame exactly the size of that box.
 */
export interface SelectionExportDocument {
  frameSize: { width: number; height: number };
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
}

function shiftProperties(
  props: ElementProperties,
  dx: number,
  dy: number,
): ElementProperties {
  if (props.type === "path") {
    const { points, handles, bounds, subpaths } = translatePoints(
      props.points,
      dx,
      dy,
      props.handles,
      props.subpaths,
    );
    return {
      ...props,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      points,
      handles: props.handles ? handles : undefined,
      subpaths: props.subpaths ? subpaths : undefined,
    };
  }
  return { ...props, x: props.x + dx, y: props.y + dy };
}

/**
 * Build the sub-document for `selectedLayerIds`, or null when the selection has
 * nothing renderable (no element properties, or a zero-area box).
 */
export function buildSelectionExportDocument(
  layers: readonly LayerType[],
  elementProperties: Readonly<Record<string, ElementProperties>>,
  selectedLayerIds: readonly string[],
): SelectionExportDocument | null {
  const included = new Set<string>();
  for (const id of selectedLayerIds) {
    if (!layers.some((layer) => layer.id === id)) continue;
    included.add(id);
    for (const child of collectDescendantIds(layers, id)) included.add(child);
  }
  if (included.size === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of included) {
    const props = elementProperties[id];
    if (!props) continue;
    const box = getElementBoundingBox(props);
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  if (!Number.isFinite(minX) || maxX - minX <= 0 || maxY - minY <= 0) {
    return null;
  }

  const subLayers = layers
    .filter((layer) => included.has(layer.id))
    .map((layer) => ({
      ...layer,
      active: false,
      // Hidden ancestors are outside the export, so selected roots become roots.
      parentId:
        layer.parentId && included.has(layer.parentId) ? layer.parentId : null,
      // A selected layer is exported even if it is hidden in the document.
      visible: selectedLayerIds.includes(layer.id) ? true : layer.visible,
    }));

  const subProperties: Record<string, ElementProperties> = {};
  for (const id of included) {
    const props = elementProperties[id];
    if (props) subProperties[id] = shiftProperties(props, -minX, -minY);
  }

  return {
    frameSize: {
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY),
    },
    layers: subLayers,
    elementProperties: subProperties,
  };
}

function round(value: number): string {
  return `${Math.round(value * 100) / 100}`;
}

/**
 * Simple CSS for one element ("Copy as CSS"): size, background/fill,
 * border-radius, border and opacity. Gradients and non-rect geometry are
 * outside what a plain CSS box expresses, so only solid colours are emitted.
 * Returns null when there is nothing to copy.
 */
export function buildElementCss(
  props: ElementProperties | undefined,
  name = "layer",
): string | null {
  if (!props) return null;
  const box = getElementBoundingBox(props);
  const lines: string[] = [
    `width: ${round(box.width)}px;`,
    `height: ${round(box.height)}px;`,
  ];

  if (props.type === "shape" || props.type === "path") {
    const fill = props.fill as unknown;
    if (typeof fill === "string" && fill && fill !== "none") {
      lines.push(`background: ${fill};`);
    }
    if (props.type === "shape") {
      if (props.kind === "circle") lines.push("border-radius: 50%;");
      else if (props.kind === "rect" && (props.cornerRadius ?? 0) > 0) {
        lines.push(`border-radius: ${round(props.cornerRadius ?? 0)}px;`);
      }
    }
    if (props.strokeWidth > 0 && props.stroke && props.stroke !== "none") {
      lines.push(`border: ${round(props.strokeWidth)}px solid ${props.stroke};`);
    }
  } else if (props.type === "text") {
    lines.push(`color: ${props.color};`);
    lines.push(`font-family: ${props.fontFamily};`);
    lines.push(`font-size: ${round(props.fontSize)}px;`);
    lines.push(`font-weight: ${props.fontWeight};`);
    if (props.backgroundColor) lines.push(`background: ${props.backgroundColor};`);
  }

  const opacity = "opacity" in props ? props.opacity : undefined;
  if (typeof opacity === "number" && opacity < 1) {
    lines.push(`opacity: ${round(opacity)};`);
  }
  const rotation = "rotation" in props ? props.rotation : undefined;
  if (rotation) lines.push(`transform: rotate(${round(rotation)}deg);`);

  const selector = `.${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "layer"}`;
  return `${selector} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`;
}
