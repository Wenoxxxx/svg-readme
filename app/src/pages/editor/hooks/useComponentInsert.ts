import { useCallback, type MutableRefObject } from "react";
import type { LayerType } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";
import type { TemplateBuild } from "../../../lib/templates/templatePrimitives";
import { isBackgroundGroup } from "../../../lib/templates/backgroundAnimations";

// ─── Pure document helpers (unit-tested) ─────────────────────────────────────

export interface ComponentInsert {
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
  selectId: string;
}

/** Append a component group on top, deactivating existing layers. */
export function appendComponentToDocument(
  doc: { layers: LayerType[]; elementProperties: Record<string, ElementProperties> },
  built: TemplateBuild & { selectId: string },
): { layers: LayerType[]; elementProperties: Record<string, ElementProperties>; selectId: string } {
  const existingIds = new Set(doc.layers.map((l) => l.id));
  let layers = built.layers;
  let elementProperties = built.elementProperties;
  let selectId = built.selectId;
  if (layers.some((l) => existingIds.has(l.id))) {
    const suffix = `-${Date.now().toString(36)}`;
    layers = layers.map((l) => ({
      ...l,
      id: `${l.id}${suffix}`,
      parentId: l.parentId ? `${l.parentId}${suffix}` : l.parentId,
    }));
    const remapped: Record<string, ElementProperties> = {};
    for (const [id, props] of Object.entries(built.elementProperties)) {
      remapped[`${id}${suffix}`] = props;
    }
    elementProperties = remapped;
    selectId = `${built.selectId}${suffix}`;
  }
  return {
    layers: [
      ...doc.layers.map((l) => ({ ...l, active: false })),
      ...layers.map((l) => ({ ...l, active: l.id === selectId })),
    ],
    elementProperties: { ...doc.elementProperties, ...elementProperties },
    selectId,
  };
}

/** Remap every id in a template build (used when ids collide with the doc). */
function remapBuildIds(built: TemplateBuild): { layers: LayerType[]; elementProperties: Record<string, ElementProperties> } {
  const suffix = `-${Date.now().toString(36)}`;
  const layers = built.layers.map((l) => ({
    ...l,
    id: `${l.id}${suffix}`,
    parentId: l.parentId ? `${l.parentId}${suffix}` : l.parentId,
  }));
  const elementProperties: Record<string, ElementProperties> = {};
  for (const [id, props] of Object.entries(built.elementProperties)) {
    elementProperties[`${id}${suffix}`] = props;
  }
  return { layers, elementProperties };
}

/** Replace bg- groups with a new background build, keeping foreground order. */
export function replaceBackgroundInDocument(
  doc: { layers: LayerType[]; elementProperties: Record<string, ElementProperties> },
  built: TemplateBuild,
): { layers: LayerType[]; elementProperties: Record<string, ElementProperties> } {
  const bgIds = new Set(doc.layers.filter(isBackgroundGroup).map((l) => l.id));
  const collectDescendants = (parentId: string, layers: LayerType[]): string[] => {
    const out: string[] = [];
    for (const l of layers) {
      if ((l.parentId ?? null) === parentId) {
        out.push(l.id, ...collectDescendants(l.id, layers));
      }
    }
    return out;
  };
  const removeIds = new Set<string>(bgIds);
  for (const id of bgIds) {
    for (const child of collectDescendants(id, doc.layers)) removeIds.add(child);
  }
  // Remember the root slot of the first removed bg so the new bg lands there.
  const firstBgIndex = doc.layers.findIndex((l) => removeIds.has(l.id) && (l.parentId ?? null) === null);
  // Remap on collision (e.g. same-ms double insert shares Date.now() ids).
  const existingIds = new Set(doc.layers.map((l) => l.id));
  let newLayers = built.layers;
  let newProps = built.elementProperties;
  if (newLayers.some((l) => existingIds.has(l.id))) {
    ({ layers: newLayers, elementProperties: newProps } = remapBuildIds(built));
  }
  const keptLayers = doc.layers
    .filter((l) => !removeIds.has(l.id))
    .map((l) => ({ ...l, active: false }));
  const keptProps: Record<string, ElementProperties> = {};
  for (const [id, props] of Object.entries(doc.elementProperties)) {
    if (!removeIds.has(id)) keptProps[id] = props;
  }
  const layers =
    firstBgIndex < 0
      ? [...newLayers, ...keptLayers]
      : [
          ...keptLayers.slice(0, Math.min(firstBgIndex, keptLayers.length)),
          ...newLayers,
          ...keptLayers.slice(Math.min(firstBgIndex, keptLayers.length)),
        ];
  return {
    layers,
    elementProperties: { ...keptProps, ...newProps },
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseComponentInsertParams {
  documentRef: MutableRefObject<{
    layers: LayerType[];
    elementProperties: Record<string, ElementProperties>;
    selectedLayerIds: string[];
  }>;
  saveToHistory: () => void;
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  setElementProperties: React.Dispatch<React.SetStateAction<Record<string, ElementProperties>>>;
  setSelectedLayerId: (id: string | null) => void;
  setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useComponentInsert({
  documentRef,
  saveToHistory,
  setLayers,
  setElementProperties,
  setSelectedLayerId,
  setSelectedLayerIds,
}: UseComponentInsertParams) {
  const handleInsertComponent = useCallback(
    (built: TemplateBuild & { selectId: string }) => {
      saveToHistory();
      const next = appendComponentToDocument(documentRef.current, built);
      setLayers(next.layers);
      setElementProperties(next.elementProperties);
      setSelectedLayerId(next.selectId);
      setSelectedLayerIds([next.selectId]);
    },
    [documentRef, saveToHistory, setLayers, setElementProperties, setSelectedLayerId, setSelectedLayerIds],
  );

  const handleReplaceBackground = useCallback(
    (built: TemplateBuild) => {
      saveToHistory();
      const next = replaceBackgroundInDocument(documentRef.current, built);
      setLayers(next.layers);
      setElementProperties(next.elementProperties);
      setSelectedLayerId(null);
      setSelectedLayerIds([]);
    },
    [documentRef, saveToHistory, setLayers, setElementProperties, setSelectedLayerId, setSelectedLayerIds],
  );

  return { handleInsertComponent, handleReplaceBackground };
}
