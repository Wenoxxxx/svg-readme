import type { LayerType } from "../../../context/EditorContext";
import type {
  ElementProperties,
  PathElementProperties,
  ShapeElementProperties,
} from "../../../components/editor-canvas/ElementsRenderer";
import type { Pt } from "../booleanGeometry";
import { computePointsBounds } from "../pathUtils";
import { collectDescendantIds } from "../layerTree/model";
import { shapeToPolygon } from "./booleanOps";

/**
 * Flatten (Figma's Ctrl+E): merge the selected shapes/paths — and every
 * shape/path inside selected groups — into ONE path layer whose subpaths are
 * the original outlines.
 *
 * Every outline is normalised to the same winding so the nonzero fill rule
 * paints the union of the parts (no accidental holes where they overlap).
 * Existing boolean-op holes inside a path keep their opposite winding.
 *
 * Only geometry that has an outline can be flattened: images, text and open
 * strokes (lines, open paths) cannot, and `canFlattenSelection` gates the
 * command off for them instead of silently dropping them.
 */
export interface FlattenResult {
  updatedLayers: LayerType[];
  updatedProperties: Record<string, ElementProperties>;
  /** Id of the new path layer. */
  pathId: string;
  removedIds: string[];
}

type Outline = ShapeElementProperties | PathElementProperties;

/** Signed area (shoelace). Positive = clockwise in screen space (y down). */
function signedArea(loop: readonly Pt[]): number {
  let area = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x1, y1] = loop[i];
    const [x2, y2] = loop[(i + 1) % loop.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function withWinding(loop: Pt[], clockwise: boolean): Pt[] {
  return signedArea(loop) >= 0 === clockwise ? loop : [...loop].reverse();
}

function cubic(p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0],
    a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1],
  ];
}

/** Sample a closed path's main loop, following bezier handles when present. */
function samplePathLoop(props: PathElementProperties): Pt[] {
  const { points, handles } = props;
  if (!handles || handles.every((h) => !h)) {
    return points.map(([x, y]) => [x, y] as Pt);
  }
  const out: Pt[] = [];
  const steps = 16;
  for (let i = 0; i < points.length; i++) {
    const p0 = points[i] as Pt;
    const p1 = points[(i + 1) % points.length] as Pt;
    const c1 = (handles[i]?.out ?? p0) as Pt;
    const c2 = (handles[(i + 1) % points.length]?.in ?? p1) as Pt;
    out.push([p0[0], p0[1]]);
    if (handles[i]?.out || handles[(i + 1) % points.length]?.in) {
      for (let s = 1; s < steps; s++) out.push(cubic(p0, c1, c2, p1, s / steps));
    }
  }
  return out;
}

/** The outline loops of one element, or null when it has no fillable outline. */
function outlineLoops(props: ElementProperties | undefined): Pt[][] | null {
  if (!props) return null;
  if (props.type === "path") {
    if (!props.closed || props.points.length < 3) return null;
    if (props.rotation) {
      // shapeToPolygon bakes rotation; it ignores handles, which is acceptable
      // for the (rare) rotated curved path.
      const poly = shapeToPolygon(props);
      return poly ? [poly, ...(props.subpaths ?? [])] : null;
    }
    return [samplePathLoop(props), ...(props.subpaths ?? []).map((l) => [...l])];
  }
  if (props.type === "shape") {
    const poly = shapeToPolygon(props);
    return poly ? [poly] : null;
  }
  return null;
}

/** Leaf layers the selection covers: selected leaves + leaves inside selected groups. */
function collectLeaves(
  layers: readonly LayerType[],
  selectedLayerIds: readonly string[],
): { leaves: string[]; covered: Set<string> } {
  const covered = new Set<string>();
  for (const id of selectedLayerIds) {
    if (!layers.some((layer) => layer.id === id)) continue;
    covered.add(id);
    for (const child of collectDescendantIds(layers, id)) covered.add(child);
  }
  const leaves = layers
    .filter((layer) => covered.has(layer.id) && layer.type !== "group")
    .map((layer) => layer.id);
  return { leaves, covered };
}

/**
 * True when Flatten can act on the selection: at least one outline, and no
 * covered leaf that has no outline (image, text, line, open path).
 */
export function canFlattenSelection(
  layers: readonly LayerType[],
  elementProperties: Readonly<Record<string, ElementProperties>>,
  selectedLayerIds: readonly string[],
): boolean {
  const { leaves } = collectLeaves(layers, selectedLayerIds);
  if (leaves.length === 0) return false;
  return leaves.every((id) => outlineLoops(elementProperties[id]) !== null);
}

export function flattenLayers(
  layers: LayerType[],
  elementProperties: Record<string, ElementProperties>,
  selectedLayerIds: string[],
): FlattenResult | null {
  if (!canFlattenSelection(layers, elementProperties, selectedLayerIds)) {
    return null;
  }
  const { leaves, covered } = collectLeaves(layers, selectedLayerIds);

  const loops: Pt[][] = [];
  for (const id of leaves) {
    const parts = outlineLoops(elementProperties[id]);
    if (!parts) return null;
    const [outer, ...holes] = parts;
    loops.push(withWinding(outer, true));
    for (const hole of holes) loops.push(withWinding(hole, false));
  }
  if (loops.length === 0) return null;

  // Style comes from the frontmost leaf (last in paint order), like Figma.
  const styleSource = elementProperties[leaves[leaves.length - 1]] as Outline;
  const bounds = computePointsBounds(loops.flat());

  // The result takes the slot (and parent) of the frontmost selected top-level
  // layer, so it paints where the merged stack used to.
  const selectedSet = new Set(selectedLayerIds);
  let anchorIndex = -1;
  layers.forEach((layer, index) => {
    if (selectedSet.has(layer.id)) anchorIndex = index;
  });
  const anchor = layers[anchorIndex];
  const parentCandidate = anchor?.parentId ?? null;
  const parentId =
    parentCandidate && !covered.has(parentCandidate) ? parentCandidate : null;

  const pathId = `flatten-${Date.now()}`;
  const pathLayer: LayerType = {
    id: pathId,
    name: selectedLayerIds.length === 1 && anchor ? anchor.name : "Vector",
    type: "shape",
    locked: false,
    visible: true,
    active: true,
    parentId,
  };

  const pathProps: PathElementProperties = {
    type: "path",
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points: loops[0],
    subpaths: loops.length > 1 ? loops.slice(1) : undefined,
    stroke: styleSource.stroke,
    strokeWidth: styleSource.strokeWidth,
    fill: styleSource.fill,
    opacity: styleSource.opacity ?? 1,
    closed: true,
  };

  const updatedLayers: LayerType[] = [];
  layers.forEach((layer, index) => {
    if (!covered.has(layer.id)) {
      updatedLayers.push(layer.active ? { ...layer, active: false } : layer);
    }
    if (index === anchorIndex) updatedLayers.push(pathLayer);
  });

  const updatedProperties = { ...elementProperties };
  for (const id of covered) delete updatedProperties[id];
  updatedProperties[pathId] = pathProps;

  return {
    updatedLayers,
    updatedProperties,
    pathId,
    removedIds: [...covered],
  };
}
