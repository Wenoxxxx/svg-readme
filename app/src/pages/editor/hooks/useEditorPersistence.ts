import { useCallback, useEffect, useRef } from "react";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";
import type { LayerType } from "../../../context/EditorContext";
import {
  flushAutosave,
  autosave as autosaveFn,
  resetPersistence,
  setCurrentProjectId as setPersistenceProjectId,
  adoptDocumentAsSaved,
  type DocumentState as PersistenceDocState,
} from "../../../lib/persistence";
import { clearEditorStorage } from "../../../context/EditorContext";
import type { HistoryState } from "./useEditorHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseEditorPersistenceParams {
  isProjectActive: boolean;
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
  frameSize: { width: number; height: number };
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  setElementProperties: React.Dispatch<React.SetStateAction<Record<string, ElementProperties>>>;
  setFrameSize: (size: { width: number; height: number }) => void;
  setCurrentProjectId: (id: string | null) => void;
  setProjectName: (name: string) => void;
  setIsProjectActive: (active: boolean) => void;
  setSelectedLayerId: (id: string | null) => void;
  setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
  markClean: () => void;
  setHistory: React.Dispatch<React.SetStateAction<HistoryState>>;
}

// ─── Hook (local-only: no backend) ────────────────────────────────────────────

export function useEditorPersistence({
  isProjectActive,
  layers,
  elementProperties,
  frameSize,
  setLayers,
  setElementProperties,
  setFrameSize,
  setCurrentProjectId,
  setProjectName,
  setIsProjectActive,
  setSelectedLayerId,
  setSelectedLayerIds,
  markClean,
  setHistory,
}: UseEditorPersistenceParams) {
  const persistenceDocRef = useRef<PersistenceDocState>({ layers, elementProperties, frameSize });
  useEffect(() => {
    persistenceDocRef.current = { layers, elementProperties, frameSize };
  }, [layers, elementProperties, frameSize]);

  // Debounced local autosave status (no network).
  useEffect(() => {
    if (!isProjectActive) return;
    if (layers.length === 0 && Object.keys(elementProperties).length === 0) return;
    autosaveFn(persistenceDocRef.current);
  }, [layers, elementProperties, isProjectActive]);

  // Open-design event bus: fired by navbar file picker / drag-drop JSON.
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        name: string;
        doc: PersistenceDocState;
      };
      if (isProjectActive) {
        await flushAutosave(persistenceDocRef.current);
      }
      const pid = adoptDocumentAsSaved(detail.doc);
      setLayers(detail.doc.layers);
      setElementProperties(detail.doc.elementProperties);
      setFrameSize(detail.doc.frameSize);
      setCurrentProjectId(pid);
      setPersistenceProjectId(pid);
      setProjectName(detail.name);
      setSelectedLayerId(null);
      setSelectedLayerIds([]);
      setIsProjectActive(true);
      setHistory({ past: [], future: [] });
      markClean();
    };
    window.addEventListener("open-design", handler);
    // Legacy backend event name — kept as an alias during migration.
    window.addEventListener("load-project", handler as EventListener);
    return () => {
      window.removeEventListener("open-design", handler);
      window.removeEventListener("load-project", handler as EventListener);
    };
  }, [
    isProjectActive, setLayers, setElementProperties, setFrameSize,
    setCurrentProjectId, setProjectName, setIsProjectActive,
    setSelectedLayerId, setSelectedLayerIds, markClean, setHistory,
  ]);

  const handleNewProject = useCallback(() => {
    clearEditorStorage();
    setLayers([]);
    setElementProperties({});
    setSelectedLayerId(null);
    setSelectedLayerIds([]);
    setIsProjectActive(false);
    setHistory({ past: [], future: [] });
    markClean();
    resetPersistence();
    setCurrentProjectId(null);
    setPersistenceProjectId(null);
    setProjectName("Untitled");
  }, [setLayers, setElementProperties, setSelectedLayerId, setSelectedLayerIds, setIsProjectActive, markClean, setCurrentProjectId, setProjectName, setHistory]);

  // Ctrl+S: caller (navbar) triggers file download; hook just exposes doc ref.
  const handleSave = useCallback(() => {
    window.dispatchEvent(new CustomEvent("request-design-save"));
  }, []);

  return { persistenceDocRef, handleNewProject, handleSave };
}
