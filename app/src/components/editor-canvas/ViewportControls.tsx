import { useState, useRef, useEffect } from "react";
import { GridFour, Magnet, ArrowsOut, Minus, Plus, CaretDown } from "@phosphor-icons/react";

interface ViewportControlsProps {
  zoom: number;
  gridEnabled: boolean;
  snapEnabled: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onZoomTo?: (zoom: number) => void;
}

const ZOOM_PRESETS = [25, 50, 100, 200, 400];

export default function ViewportControls({
  zoom,
  gridEnabled,
  snapEnabled,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleGrid,
  onToggleSnap,
  onZoomTo,
}: ViewportControlsProps) {
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showZoomMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowZoomMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showZoomMenu]);

  const handleZoomTo = (pct: number) => {
    onZoomTo?.(pct / 100);
    setShowZoomMenu(false);
  };

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl border border-white/10 bg-[#09090b]/90 p-1.5 shadow-2xl backdrop-blur-xl"
      role="toolbar"
      aria-label="Canvas viewport controls"
      data-tour="viewport"
    >
      <button
        type="button"
        onClick={onZoomOut}
        className="flex items-center justify-center w-8 h-8 transition-colors rounded-lg touch-target text-zinc-400 hover:bg-white/10 hover:text-white active:scale-95"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <Minus className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Zoom percentage with dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowZoomMenu((prev) => !prev)}
          className="flex items-center gap-1 px-2 py-2 font-mono text-xs text-center transition-colors rounded-lg min-w-16 text-zinc-300 hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Zoom level"
          title="Zoom level"
        >
          {Math.round(zoom * 100)}%
          <CaretDown className="w-3 h-3 text-zinc-500" aria-hidden="true" />
        </button>

        {showZoomMenu && (
          <div className="absolute bottom-full left-0 mb-2 min-w-28 rounded-lg bg-zinc-900 border border-white/10 shadow-2xl p-1.5 flex flex-col gap-0.5 z-50">
            <div className="px-2 py-1 text-[10px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider font-semibold select-none">
              Zoom to
            </div>
            {ZOOM_PRESETS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleZoomTo(pct)}
                className={`px-3 py-1.5 text-xs rounded-md text-left transition-colors ${
                  Math.round(zoom * 100) === pct
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {pct}%
              </button>
            ))}
            <div className="my-0.5 h-px bg-white/5" />
            <button
              type="button"
              onClick={() => {
                onFit();
                setShowZoomMenu(false);
              }}
              className="px-3 py-1.5 text-xs rounded-md text-left text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              Fit to screen
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onZoomIn}
        className="flex items-center justify-center w-8 h-8 transition-colors rounded-lg touch-target text-zinc-400 hover:bg-white/10 hover:text-white active:scale-95"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
      </button>
      <span className="w-px h-5 mx-1 bg-white/10" aria-hidden="true" />
      <button
        type="button"
        onClick={onFit}
        className="flex items-center justify-center w-8 h-8 transition-colors rounded-lg touch-target text-zinc-400 hover:bg-white/10 hover:text-white active:scale-95"
        aria-label="Center canvas"
        title="Center canvas"
      >
        <ArrowsOut className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onToggleGrid}
        className={`touch-target flex h-8 w-8 items-center justify-center rounded-lg transition-colors active:scale-95 ${
          gridEnabled
            ? "bg-blue-600/20 text-blue-400"
            : "text-zinc-500 hover:bg-white/10 hover:text-white"
        }`}
        aria-label={gridEnabled ? "Hide grid" : "Show grid"}
        aria-pressed={gridEnabled}
        title="Toggle grid (G)"
      >
        <GridFour className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onToggleSnap}
        className={`touch-target flex h-8 w-8 items-center justify-center rounded-lg transition-colors active:scale-95 ${
          snapEnabled
            ? "bg-blue-600/20 text-blue-400"
            : "text-zinc-500 hover:bg-white/10 hover:text-white"
        }`}
        aria-label={snapEnabled ? "Disable snapping" : "Enable snapping"}
        aria-pressed={snapEnabled}
        title="Toggle snapping"
      >
        <Magnet className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
