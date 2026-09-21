import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  TextElementProperties,
  ImageElementProperties,
  ElementProperties,
} from "../../../components/editor-canvas/ElementsRenderer";
import { duplicateLayersWithChildren } from "../../../lib/editor/documentActions";
import {
  isClipboardReadable,
  pasteInPlace,
  replaceLayers,
} from "../../../lib/editor/layerOps/clipboardOps";
import { parseSvgMarkup } from "../../../lib/importSvg";
import { buildSvgString } from "../../../lib/export";
import { DEFAULT_TEXT_PROPS, DEFAULT_TEXT_HEIGHT } from "../../../components/editor-canvas/types";
import type { LayerType } from "../../../context/EditorContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClipboardState {
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
}

interface UseEditorClipboardParams {
  selectedLayerIds: string[];
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
  frameSize: { width: number; height: number };
  saveToHistory: () => void;
  setLayers: React.Dispatch<React.SetStateAction<LayerType[]>>;
  setElementProperties: React.Dispatch<React.SetStateAction<Record<string, ElementProperties>>>;
  setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedLayerId: (id: string | null) => void;
  /**
   * Publishes how many top-level layers the clipboard holds so the context
   * menus can enable/disable the paste rows without owning the clipboard.
   */
  onClipboardChange?: (layerCount: number) => void;
}

const PASTE_OFFSET = 20;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages clipboard operations (copy/paste) for editor layers.
 * Supports both internal clipboard and OS clipboard (A10).
 */
export function useEditorClipboard({
  selectedLayerIds,
  layers,
  elementProperties,
  frameSize,
  saveToHistory,
  setLayers,
  setElementProperties,
  setSelectedLayerIds,
  setSelectedLayerId,
  onClipboardChange,
}: UseEditorClipboardParams) {
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);

  /**
   * Top-level layers in the clipboard — the payload layers whose parent is not
   * part of the copied set. This is what "Paste to replace" matches against the
   * selection size, so a copied group counts as one layer, not as its children.
   */
  const clipboardCount = useMemo(() => {
    if (!clipboard) return 0;
    const clipIds = new Set(clipboard.layers.map((layer) => layer.id));
    return clipboard.layers.filter((layer) => {
      const parentId = layer.parentId ?? null;
      return parentId === null || !clipIds.has(parentId);
    }).length;
  }, [clipboard]);

  useEffect(() => {
    onClipboardChange?.(clipboardCount);
  }, [clipboardCount, onClipboardChange]);

  /** Shared paste flow: remaps ids + parentIds, offsets positions, appends + selects. */
  const applyPaste = useCallback(
    (source: ClipboardState) => {
      if (!source || source.layers.length === 0) return;

      const result = duplicateLayersWithChildren(
        source.layers,
        source.elementProperties,
        source.layers.map((l) => l.id),
        PASTE_OFFSET,
        PASTE_OFFSET,
      );
      if (!result) return;
      const { duplicatedLayers: newLayers, duplicatedProperties: newElementProperties, duplicatedTopIds: newSelectedLayerIds } = result;

      saveToHistory();
      setLayers((prev) => [...prev, ...newLayers]);
      setElementProperties((prev) => ({
        ...prev,
        ...newElementProperties,
      }));
      setSelectedLayerIds(newSelectedLayerIds);
      setSelectedLayerId(newSelectedLayerIds[0] ?? null);
    },
    [saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId],
  );

  /** Paste raw SVG markup as new layers (A10). */
  const pasteSvgMarkup = useCallback(
    (svgText: string) => {
      const result = parseSvgMarkup(svgText);
      if (!result.layers.length) return;
      saveToHistory();
      setLayers((prev) => [
        ...prev.map((l) => ({ ...l, active: false })),
        ...result.layers.map((l) => ({ ...l, active: false })),
      ]);
      setElementProperties((prev) => ({
        ...prev,
        ...result.elementProperties,
      }));
      setSelectedLayerIds([result.layers[0].id]);
      setSelectedLayerId(result.layers[0].id);
    },
    [saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId],
  );

  /** Paste plain text as a new text layer (A10). */
  const pasteAsText = useCallback(
    (text: string) => {
      const tempId = `text-${Date.now()}`;
      const newLayer: LayerType = {
        id: tempId,
        name: "Text",
        type: "text",
        locked: false,
        visible: true,
        active: true,
      };
      const newProps: TextElementProperties = {
        ...DEFAULT_TEXT_PROPS,
        x: 50,
        y: 50,
        width: "auto",
        height: DEFAULT_TEXT_HEIGHT,
        content: text.slice(0, 500),
      };
      saveToHistory();
      setLayers((prev) => [
        ...prev.map((l) => ({ ...l, active: false })),
        newLayer,
      ]);
      setElementProperties((prev) => ({ ...prev, [tempId]: newProps }));
      setSelectedLayerIds([tempId]);
      setSelectedLayerId(tempId);
    },
    [saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId],
  );

  /** Paste an image blob as a new image layer (A10). */
  const pasteAsImage = useCallback(
    (blob: Blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const tempId = `image-${Date.now()}`;
        const newLayer: LayerType = {
          id: tempId,
          name: "Image",
          type: "image",
          locked: false,
          visible: true,
          active: true,
        };
        const newProps: ImageElementProperties = {
          type: "image",
          x: 50,
          y: 50,
          width: 300,
          height: 150,
          url: dataUrl,
          opacity: 1,
        };
        saveToHistory();
        setLayers((prev) => [
          ...prev.map((l) => ({ ...l, active: false })),
          newLayer,
        ]);
        setElementProperties((prev) => ({ ...prev, [tempId]: newProps }));
        setSelectedLayerIds([tempId]);
        setSelectedLayerId(tempId);
      };
      reader.readAsDataURL(blob);
    },
    [saveToHistory, setLayers, setElementProperties, setSelectedLayerIds, setSelectedLayerId],
  );

  // ── Copy selected layers to clipboard ───────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (selectedLayerIds.length === 0) return;

    const copiedLayers = layers.filter((layer) =>
      selectedLayerIds.includes(layer.id),
    );
    const copiedElementProperties: Record<string, ElementProperties> = {};
    selectedLayerIds.forEach((id) => {
      if (elementProperties[id]) {
        copiedElementProperties[id] = { ...elementProperties[id] };
      }
    });

    setClipboard({
      layers: copiedLayers,
      elementProperties: copiedElementProperties,
    });

    try {
      const svgString = buildSvgString({ frameSize, elementProperties, layers });
      const payload = JSON.stringify({
        layers: copiedLayers,
        elementProperties: copiedElementProperties,
      });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([svgString], { type: "text/plain" }),
          "application/x-svg-readme": new Blob([payload], {
            type: "application/json",
          }),
        }),
      ]);
    } catch {
      // OS clipboard unavailable — the internal clipboard still works.
    }
  }, [selectedLayerIds, layers, elementProperties, frameSize]);

  // ── Paste from clipboard ────────────────────────────────────────────────
  const handlePaste = useCallback(async () => {
    let pasted = false;
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes("application/x-svg-readme")) {
          const blob = await item.getType("application/x-svg-readme");
          const data = JSON.parse(await blob.text()) as ClipboardState;
          if (data && Array.isArray(data.layers) && data.layers.length > 0) {
            applyPaste(data);
            pasted = true;
          }
          break;
        }
      }
      if (!pasted) {
        for (const item of items) {
          if (item.types.includes("text/plain")) {
            const text = await (await item.getType("text/plain")).text();
            if (/<svg[\s>]/i.test(text)) {
              pasteSvgMarkup(text);
              pasted = true;
            } else if (text.trim()) {
              pasteAsText(text);
              pasted = true;
            }
            break;
          }
          if (!pasted && item.types.includes("image/png")) {
            const blob = await item.getType("image/png");
            pasteAsImage(blob);
            pasted = true;
            break;
          }
        }
      }
    } catch {
      // Permissions denied / read unsupported — use the internal clipboard.
    }
    if (!pasted && clipboard) applyPaste(clipboard);
  }, [clipboard, applyPaste, pasteSvgMarkup, pasteAsText, pasteAsImage]);

  // ── Paste here ──────────────────────────────────────────────────────────
  // Drops the copied layers back where they came from, with no cascade offset.
  //
  // When this app has not copied anything yet there is still the OS clipboard to
  // consider — that is the same command ("paste"), so it falls through to the
  // full paste flow, which handles our own JSON payload, raw SVG, plain text and
  // images. Splitting them would make Ctrl+V silently do nothing whenever the
  // content came from outside the editor.
  const handlePasteHere = useCallback(() => {
    if (!clipboard) {
      void handlePaste();
      return;
    }
    const result = pasteInPlace(layers, elementProperties, clipboard);
    if (!result) return;

    saveToHistory();
    setLayers(result.updatedLayers);
    setElementProperties(result.updatedProperties);
    setSelectedLayerIds(result.selectedIds);
    setSelectedLayerId(result.selectedIds[0] ?? null);
  }, [
    clipboard,
    layers,
    elementProperties,
    handlePaste,
    saveToHistory,
    setLayers,
    setElementProperties,
    setSelectedLayerIds,
    setSelectedLayerId,
  ]);

  // ── Paste to replace ────────────────────────────────────────────────────
  // Swaps the selection for the clipboard 1:1. The capability layer already
  // refuses mismatched counts, so a failed match here is a no-op rather than a
  // partial apply.
  const handlePasteToReplace = useCallback(() => {
    if (!clipboard) return;
    const result = replaceLayers(
      layers,
      elementProperties,
      selectedLayerIds,
      clipboard,
    );
    if (!result) return;

    saveToHistory();
    setLayers(result.updatedLayers);
    setElementProperties(result.updatedProperties);
    setSelectedLayerIds(result.selectedIds);
    setSelectedLayerId(result.selectedIds[0] ?? null);
  }, [
    clipboard,
    layers,
    elementProperties,
    selectedLayerIds,
    saveToHistory,
    setLayers,
    setElementProperties,
    setSelectedLayerIds,
    setSelectedLayerId,
  ]);

  return {
    handleCopy,
    handlePaste,
    handlePasteHere,
    handlePasteToReplace,
    /** Whether the internal clipboard holds anything. */
    hasClipboard: clipboard !== null && clipboard.layers.length > 0,
    /** Top-level layer count, used to gate Paste to replace. */
    clipboardCount,
    /** Whether the OS clipboard could be read (enables Paste here early). */
    clipboardReadable: isClipboardReadable(),
  };
}
