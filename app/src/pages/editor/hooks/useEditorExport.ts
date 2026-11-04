import { useCallback, useEffect, useRef } from "react";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";
import type { LayerType } from "../../../context/EditorContext";
import {
  buildSvgString,
  downloadSvg,
  copySvgText,
  copyMarkdown,
  copyImageToClipboard,
  notifyCopyFailure,
} from "../../../lib/export";
import { downloadPng } from "../../../lib/exportPng";
import { exportAnimated, downloadGif } from "../../../lib/animatedExport";
import type { ExportOptions } from "../../../components/ui/EditorRightBar";
import {
  buildElementCss,
  buildSelectionExportDocument,
} from "../../../lib/editor/layerOps";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportData {
  frameSize: { width: number; height: number };
  elementProperties: Record<string, ElementProperties>;
  layers: LayerType[];
  /** Current selection — scopes the menu's "Copy as SVG / PNG / CSS". */
  selectedLayerIds?: string[];
}

/** A copied selection is bare artwork: no banner background, frame or border. */
const SELECTION_SVG_OPTIONS = {
  backgroundColor: "transparent",
  rounded: false,
  showBorder: false,
} as const;

const reportCopyFailure = (err: unknown) =>
  notifyCopyFailure(err instanceof Error ? err.message : undefined);

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Handles all export operations: SVG/PNG/GIF download, copy-to-clipboard,
 * and listens for custom events from the ExportTab/AnimateTab panels.
 */
export function useEditorExport(data: ExportData) {
  const exportDataRef = useRef(data);
  useEffect(() => {
    exportDataRef.current = data;
  }, [data]);

  // ── Quick export button: build SVG and trigger download ────────────────
  const handleExport = useCallback(() => {
    const svgString = buildSvgString({
      frameSize: data.frameSize,
      elementProperties: data.elementProperties,
      layers: data.layers,
    });
    downloadSvg(svgString, "banner.svg");
  }, [data.frameSize, data.elementProperties, data.layers]);

  // ── Listen for custom copy/export events from EditorRightBar ───────────
  useEffect(() => {
    const toBuildOptions = (opts?: Partial<ExportOptions>) => {
      if (!opts) return {};
      return {
        backgroundColor: opts.transparent
          ? "transparent"
          : (opts.backgroundColor ?? "#09090b"),
        rounded: opts.rounded,
        borderRadius: opts.borderRadius,
        showBorder: opts.showBorder,
      };
    };
    const readOptions = (e: Event): Partial<ExportOptions> | undefined =>
      (e as CustomEvent).detail?.options;

    const handleCopySvg = (e: Event) => {
      const d = exportDataRef.current;
      const opts = readOptions(e);
      const svgString = buildSvgString({ ...d, ...toBuildOptions(opts) });
      copySvgText(svgString).catch((err: unknown) =>
        notifyCopyFailure(err instanceof Error ? err.message : undefined),
      );
    };

    const handleCopyMd = (e: Event) => {
      const opts = readOptions(e);
      copyMarkdown(`${opts?.filename ?? "banner"}.svg`).catch((err: unknown) =>
        notifyCopyFailure(err instanceof Error ? err.message : undefined),
      );
    };

    const handleExportPng = (e: Event) => {
      const d = exportDataRef.current;
      const opts = readOptions(e);
      downloadPng(
        d.frameSize,
        d.elementProperties,
        d.layers,
        `${opts?.filename ?? "banner"}.png`,
        { scale: opts?.pngScale ?? 2, ...toBuildOptions(opts) },
      ).catch(console.error);
    };

    const handleCopyImage = (e: Event) => {
      const d = exportDataRef.current;
      const opts = readOptions(e);
      const svgString = buildSvgString({ ...d, ...toBuildOptions(opts) });
      copyImageToClipboard(
        svgString,
        d.frameSize.width,
        d.frameSize.height,
        d.elementProperties,
        opts?.pngScale ?? 2,
      ).catch((err: unknown) =>
        notifyCopyFailure(err instanceof Error ? err.message : undefined),
      );
    };

    const handleExportAnimated = (e: Event) => {
      const { fps, format } = (e as CustomEvent).detail as { fps: number; format: "gif" | "png-sequence" };
      const d = exportDataRef.current;
      const dispatchProgress = (current: number, total: number, error?: string) => {
        window.dispatchEvent(new CustomEvent("export-animated-progress", {
          detail: { current, total, error },
        }));
      };
      (async () => {
        try {
          const result = await exportAnimated(
            { frameSize: d.frameSize, elementProperties: d.elementProperties, layers: d.layers, fps, format },
            (current, total) => dispatchProgress(current, total),
            () => {},
          );
          if (result.gifBlob) {
            downloadGif(result.gifBlob, "banner.gif");
          }
          // Always signal completion so the UI never stays on "Rendering…".
          dispatchProgress(1, 1);
        } catch (err) {
          console.error("Animated export failed:", err);
          dispatchProgress(0, 0, err instanceof Error ? err.message : "Animated export failed");
        }
      })();
    };

    window.addEventListener("copy-svg-code", handleCopySvg);
    window.addEventListener("copy-markdown", handleCopyMd);
    window.addEventListener("export-png", handleExportPng);
    window.addEventListener("copy-png-image", handleCopyImage);
    window.addEventListener("export-animated", handleExportAnimated);

    return () => {
      window.removeEventListener("copy-svg-code", handleCopySvg);
      window.removeEventListener("copy-markdown", handleCopyMd);
      window.removeEventListener("export-png", handleExportPng);
      window.removeEventListener("copy-png-image", handleCopyImage);
      window.removeEventListener("export-animated", handleExportAnimated);
    };
  }, []);

  // ── Selection-scoped copy (layer context menu "Copy/Paste as") ─────────
  // Only the selected layers (and their descendants) are exported, cropped to
  // the selection's bounding box — never the whole banner.
  const selectionDocument = useCallback(() => {
    const d = exportDataRef.current;
    return buildSelectionExportDocument(
      d.layers,
      d.elementProperties,
      d.selectedLayerIds ?? [],
    );
  }, []);

  const copySelectionAsSvg = useCallback(() => {
    const doc = selectionDocument();
    if (!doc) return;
    copySvgText(
      buildSvgString({ ...doc, ...SELECTION_SVG_OPTIONS }),
    ).catch(reportCopyFailure);
  }, [selectionDocument]);

  const copySelectionAsPng = useCallback(() => {
    const doc = selectionDocument();
    if (!doc) return;
    const svgString = buildSvgString({ ...doc, ...SELECTION_SVG_OPTIONS });
    copyImageToClipboard(
      svgString,
      doc.frameSize.width,
      doc.frameSize.height,
      doc.elementProperties,
      2,
    ).catch(reportCopyFailure);
  }, [selectionDocument]);

  const copySelectionAsCss = useCallback(() => {
    const d = exportDataRef.current;
    const id = d.selectedLayerIds?.[0];
    if (!id) return;
    const name = d.layers.find((layer) => layer.id === id)?.name;
    const css = buildElementCss(d.elementProperties[id], name);
    if (!css) return;
    copySvgText(css).catch(reportCopyFailure);
  }, []);

  return {
    handleExport,
    exportDataRef,
    copySelectionAsSvg,
    copySelectionAsPng,
    copySelectionAsCss,
  };
}
