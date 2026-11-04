import type { LayerType } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";

/** Comparable style signature: element type (+ shape kind) and fill/stroke. */
function signature(
  layer: LayerType,
  props: ElementProperties | undefined,
): string {
  if (!props) return `${layer.type}|-`;
  const fill =
    props.type === "text"
      ? props.color
      : props.type === "image"
        ? props.url
        : JSON.stringify(props.fill ?? null);
  const stroke =
    props.type === "shape" || props.type === "path"
      ? `${props.stroke}|${props.strokeWidth}`
      : "";
  const kind = props.type === "shape" ? props.kind : "";
  return `${layer.type}|${props.type}|${kind}|${fill}|${stroke}`;
}

/**
 * "Select matching layers": every layer whose type and fill/stroke match a
 * selected layer. The selection itself is always part of the result; locked
 * layers are skipped (they cannot be acted on from the canvas anyway).
 */
export function findMatchingLayerIds(
  layers: readonly LayerType[],
  elementProperties: Readonly<Record<string, ElementProperties>>,
  selectedLayerIds: readonly string[],
): string[] {
  const selected = new Set(selectedLayerIds);
  const wanted = new Set(
    layers
      .filter((layer) => selected.has(layer.id))
      .map((layer) => signature(layer, elementProperties[layer.id])),
  );
  if (wanted.size === 0) return [];
  return layers
    .filter(
      (layer) =>
        selected.has(layer.id) ||
        (!layer.locked &&
          wanted.has(signature(layer, elementProperties[layer.id]))),
    )
    .map((layer) => layer.id);
}
