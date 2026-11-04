import { useCallback, useRef, useState } from "react";
import {
  cloneDocumentSnapshot,
  pushHistory,
  redoDocument,
  undoDocument,
  type DocumentSnapshot,
} from "../../../lib/editor/documentActions";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";
import type { LayerType, FrameSize } from "../../../context/EditorContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HistoryState {
  past: DocumentSnapshot[];
  future: DocumentSnapshot[];
}

interface DocumentRef {
  current: {
    layers: LayerType[];
    elementProperties: Record<string, ElementProperties>;
    selectedLayerIds: string[];
    frameSize: FrameSize;
  };
}

interface UseEditorHistoryParams {
  documentRef: DocumentRef;
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  setElementProperties: React.Dispatch<React.SetStateAction<Record<string, ElementProperties>>>;
  setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedLayerId: (id: string | null) => void;
  setFrameSize: (size: FrameSize) => void;
}

/**
 * Window (ms) during which repeated `checkpoint(key)` calls with the same key
 * are merged into a single undo step (e.g. typing "0.75" into an input, or
 * dragging a colour picker).
 */
export const HISTORY_COALESCE_MS = 1000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages undo/redo history for the editor document.
 * Provides `saveToHistory` (call before any discrete mutation), `checkpoint`
 * (call before continuous edits — coalesces bursts), `handleUndo`, `handleRedo`.
 */
export function useEditorHistory({
  documentRef,
  setLayers,
  setElementProperties,
  setSelectedLayerIds,
  setSelectedLayerId,
  setFrameSize,
}: UseEditorHistoryParams) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    future: [],
  });

  // Last coalescing key + timestamp. Any explicit saveToHistory/undo/redo
  // breaks the chain so the next checkpoint always records a new step.
  const coalesceRef = useRef<{ key: string; at: number } | null>(null);

  const currentSnapshot = useCallback((): DocumentSnapshot => ({
    layers: documentRef.current.layers,
    elementProperties: documentRef.current.elementProperties,
    selectedLayerIds: documentRef.current.selectedLayerIds,
    frameSize: documentRef.current.frameSize,
  }), [documentRef]);

  const pushSnapshot = useCallback(() => {
    const snapshot = cloneDocumentSnapshot(currentSnapshot());
    setHistory((prevHistory) => ({
      past: pushHistory(prevHistory.past, snapshot),
      future: [],
    }));
  }, [currentSnapshot]);

  const saveToHistory = useCallback(() => {
    coalesceRef.current = null;
    pushSnapshot();
  }, [pushSnapshot]);

  /**
   * Record an undo step before a mutation, merging bursts of edits that share
   * `key` (each within HISTORY_COALESCE_MS of the previous) into one step.
   * Identical consecutive snapshots are already deduped by `pushHistory`, so
   * calling this after an onFocus `saveToHistory` does not add an extra step.
   */
  const checkpoint = useCallback((key: string) => {
    const now = Date.now();
    const last = coalesceRef.current;
    coalesceRef.current = { key, at: now };
    if (last && last.key === key && now - last.at < HISTORY_COALESCE_MS) return;
    pushSnapshot();
  }, [pushSnapshot]);

  const restoreSnapshot = useCallback((snapshot: DocumentSnapshot) => {
    const selected = new Set(snapshot.selectedLayerIds);
    setLayers(snapshot.layers.map((layer) => ({ ...layer, active: selected.has(layer.id) })));
    setElementProperties(snapshot.elementProperties);
    setSelectedLayerIds(snapshot.selectedLayerIds);
    setSelectedLayerId(snapshot.selectedLayerIds[0] ?? null);
    setFrameSize(snapshot.frameSize);
  }, [setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId, setFrameSize]);

  const handleUndo = useCallback(() => {
    const transition = undoDocument(history, currentSnapshot());
    if (!transition.snapshot) return;
    coalesceRef.current = null;
    restoreSnapshot(transition.snapshot);
    setHistory(transition.history);
  }, [currentSnapshot, history, restoreSnapshot]);

  const handleRedo = useCallback(() => {
    const transition = redoDocument(history, currentSnapshot());
    if (!transition.snapshot) return;
    coalesceRef.current = null;
    restoreSnapshot(transition.snapshot);
    setHistory(transition.history);
  }, [currentSnapshot, history, restoreSnapshot]);

  return {
    history,
    setHistory,
    saveToHistory,
    checkpoint,
    handleUndo,
    handleRedo,
  };
}
