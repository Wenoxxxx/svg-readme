import type {
  AutoLayoutSettings,
  LayerType,
} from "../../../context/EditorContext";
import { DEFAULT_AUTO_LAYOUT } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";
import { getTextAutoBox } from "../textMeasure";

/**
 * Auto layout for container layers.
 *
 * Mirrors OpenPencil's flex auto layout, adapted to this app's SVG model: there
 * is no Yoga engine and no live layout pass, so positions are resolved eagerly
 * and written straight onto the children's element properties. Adding a layout
 * is therefore a document edit like any other — it participates in undo/redo
 * through the normal history snapshot rather than a separate layout state.
 *
 * Only one axis is laid out: children are sized by their own properties (no
 * fill/hug resizing), then stacked with `gap`, inset by `padding`, and aligned
 * on the cross axis.
 */

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AutoLayoutSettingsInput = Partial<
  Omit<AutoLayoutSettings, "padding">
> & {
  padding?: Partial<AutoLayoutSettings["padding"]>;
};

/** Children of `parentId` in document order. */
function childIdsOf(layers: readonly LayerType[], parentId: string): string[] {
  return layers
    .filter((layer) => (layer.parentId ?? null) === parentId)
    .map((layer) => layer.id);
}

/** Fold two boxes into their union. */
function union(a: Bounds, b: Bounds): Bounds {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

/**
 * The box `layerId` occupies on the canvas.
 *
 * A leaf reads its own element properties; a container is the union of its
 * descendants' boxes (it has no geometry of its own). Returns null when nothing
 * underneath is measurable — an empty group, or a container whose children have
 * no element properties yet.
 */
export function layerBounds(
  layers: readonly LayerType[],
  elementProperties: Readonly<Record<string, ElementProperties>>,
  layerId: string,
): Bounds | null {
  const properties = elementProperties[layerId];
  if (properties) {
    // Auto-width text has no numeric width until it is measured.
    const width =
      properties.type === "text" && properties.width === "auto"
        ? getTextAutoBox(properties, properties.content).width
        : (properties.width as number);
    return {
      x: properties.x,
      y: properties.y,
      width,
      height: properties.height,
    };
  }

  let box: Bounds | null = null;
  for (const childId of childIdsOf(layers, layerId)) {
    const childBox = layerBounds(layers, elementProperties, childId);
    if (!childBox) continue;
    box = box ? union(box, childBox) : childBox;
  }
  return box;
}

/** Normalise caller-supplied settings into a complete `AutoLayoutSettings`. */
export function resolveAutoLayoutSettings(
  input?: AutoLayoutSettingsInput,
): AutoLayoutSettings {
  return {
    direction: input?.direction ?? DEFAULT_AUTO_LAYOUT.direction,
    gap: input?.gap ?? DEFAULT_AUTO_LAYOUT.gap,
    alignItems: input?.alignItems ?? DEFAULT_AUTO_LAYOUT.alignItems,
    padding: {
      ...DEFAULT_AUTO_LAYOUT.padding,
      ...(input?.padding ?? {}),
    },
  };
}

/**
 * Re-flow a container's children.
 *
 * The container "hugs" its content: the layout box is the current union of the
 * children's bounds, so re-running this after a child moves keeps the stack
 * anchored where the content already is instead of snapping to the origin.
 *
 * Returns the children's updated properties, or null when the layer is not an
 * auto-layout container (or has nothing to arrange).
 */
export function applyAutoLayout(
  layers: readonly LayerType[],
  elementProperties: Readonly<Record<string, ElementProperties>>,
  containerId: string,
): { updatedProperties: Record<string, ElementProperties> } | null {
  const container = layers.find((layer) => layer.id === containerId);
  const settings = container?.autoLayout;
  if (!container || !settings) return null;

  const children = childIdsOf(layers, containerId)
    .map((id) => ({ id, box: layerBounds(layers, elementProperties, id) }))
    .filter((child): child is { id: string; box: Bounds } => child.box !== null);
  if (children.length === 0) return null;

  const contentBox = children.reduce<Bounds>(
    (acc, child) => union(acc, child.box),
    children[0].box,
  );

  const innerX = contentBox.x + settings.padding.left;
  const innerY = contentBox.y + settings.padding.top;
  const innerWidth =
    contentBox.width - settings.padding.left - settings.padding.right;

  const updatedProperties: Record<string, ElementProperties> = {};
  let cursor = settings.direction === "vertical" ? innerY : innerX;

  for (const child of children) {
    const properties = elementProperties[child.id];
    if (!properties) continue;

    // Cross-axis offset: the children keep their own size, only their start
    // edge moves to satisfy the alignment.
    const crossOffset = (size: number) => {
      if (settings.alignItems === "center") return (innerWidth - size) / 2;
      if (settings.alignItems === "end") return innerWidth - size;
      return 0;
    };

    if (settings.direction === "vertical") {
      updatedProperties[child.id] = {
        ...properties,
        x: innerX + crossOffset(child.box.width),
        y: cursor,
      };
      cursor += child.box.height + settings.gap;
    } else {
      updatedProperties[child.id] = {
        ...properties,
        x: cursor,
        y: innerY + crossOffset(child.box.height),
      };
      cursor += child.box.width + settings.gap;
    }
  }

  return { updatedProperties };
}

export interface AddAutoLayoutResult {
  updatedLayers: LayerType[];
  updatedProperties: Record<string, ElementProperties>;
  containerId: string;
}

/**
 * Wrap the selection in a new auto-layout container and arrange it.
 *
 * Mirrors `wrapInFrame`: the children must share a parent, the container is
 * inserted where the first selected layer sat, and the selection is re-parented
 * into it. The difference is the `autoLayout` settings, which make the container
 * responsible for positioning its children from then on.
 *
 * Returns null when there is nothing to lay out.
 */
export function addAutoLayout(
  layers: LayerType[],
  elementProperties: Record<string, ElementProperties>,
  selectedLayerIds: string[],
  settings?: AutoLayoutSettingsInput,
): AddAutoLayoutResult | null {
  const selected = new Set(selectedLayerIds);
  if (selected.size === 0) return null;

  const firstIndex = layers.findIndex((layer) => selected.has(layer.id));
  if (firstIndex === -1) return null;

  const parentId = layers[firstIndex].parentId ?? null;
  const shareParent = selectedLayerIds.every((id) => {
    const layer = layers.find((l) => l.id === id);
    return layer !== undefined && (layer.parentId ?? null) === parentId;
  });
  if (!shareParent) return null;

  const containerId = `autolayout-${Date.now()}`;
  const container: LayerType = {
    id: containerId,
    name: "Auto Layout",
    type: "group",
    locked: false,
    visible: true,
    parentId,
    collapsed: false,
    autoLayout: resolveAutoLayoutSettings(settings),
  };

  const reparented = layers.map((layer) =>
    selected.has(layer.id) ? { ...layer, parentId: containerId } : layer,
  );
  const updatedLayers = [...reparented];
  updatedLayers.splice(firstIndex, 0, container);

  const layout = applyAutoLayout(updatedLayers, elementProperties, containerId);
  const updatedProperties = layout
    ? { ...elementProperties, ...layout.updatedProperties }
    : { ...elementProperties };

  return { updatedLayers, updatedProperties, containerId };
}
