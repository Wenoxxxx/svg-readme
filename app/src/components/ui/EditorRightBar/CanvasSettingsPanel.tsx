import {
  ArrowsOut,
  ArrowsLeftRight,
  Monitor,
  DeviceMobile,
  DeviceTablet,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useEditor, type FrameSize } from "../../../context/EditorContext";

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: { name: string; size: FrameSize; icon: ReactNode }[] = [
  {
    name: "Banner",
    size: { width: 700, height: 350 },
    icon: <Monitor className="w-3.5 h-3.5" />,
  },
  {
    name: "Square",
    size: { width: 500, height: 500 },
    icon: <DeviceTablet className="w-3.5 h-3.5" />,
  },
  {
    name: "Mobile",
    size: { width: 390, height: 844 },
    icon: <DeviceMobile className="w-3.5 h-3.5" />,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface CanvasSettingsPanelProps {
  /**
   * Called before any canvas-size mutation (input focus, preset click, swap) so
   * the pre-change document state (including frameSize) can be snapshotted for
   * undo — mirrors the `onPropertiesStart` history pattern.
   */
  onCanvasResizeStart?: () => void;
}

/**
 * Canvas settings shown in the Design tab when nothing is selected.
 * W/H inputs, a swap-W×H button, and the Banner/Square/Mobile presets —
 * moved from the (now removed) left-sidebar FramePanel.
 */
export default function CanvasSettingsPanel({
  onCanvasResizeStart,
}: CanvasSettingsPanelProps) {
  const { frameSize, setFrameSize } = useEditor();

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    // Integers only, clamped ≥ 1 (0/empty would break the SVG viewport).
    if (Number.isNaN(val) || val < 1) return;
    setFrameSize({ ...frameSize, width: val });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (Number.isNaN(val) || val < 1) return;
    setFrameSize({ ...frameSize, height: val });
  };

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    onCanvasResizeStart?.();
    setFrameSize({ width: preset.size.width, height: preset.size.height });
  };

  const handleSwap = () => {
    onCanvasResizeStart?.();
    setFrameSize({ width: frameSize.height, height: frameSize.width });
  };

  return (
    <div className="p-5 border-b border-white/5 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider font-semibold">
        <ArrowsOut className="w-3.5 h-3.5" />
        Canvas
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
          <span className="text-zinc-500 text-xs font-mono">W</span>
          <input
            type="number"
            aria-label="Canvas width"
            value={frameSize.width}
            onFocus={onCanvasResizeStart}
            onChange={handleWidthChange}
            className="bg-transparent text-sm w-full outline-none text-zinc-300 focus:text-white font-mono"
          />
        </div>
        <button
          onClick={handleSwap}
          title="Swap width and height"
          aria-label="Swap width and height"
          className="p-2 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-white/5 hover:border-white/15 transition-colors"
        >
          <ArrowsLeftRight className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
          <span className="text-zinc-500 text-xs font-mono">H</span>
          <input
            type="number"
            aria-label="Canvas height"
            value={frameSize.height}
            onFocus={onCanvasResizeStart}
            onChange={handleHeightChange}
            className="bg-transparent text-sm w-full outline-none text-zinc-300 focus:text-white font-mono"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-zinc-500 font-mono uppercase">
          Presets
        </span>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-md bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 text-zinc-400 hover:text-zinc-200 transition-all group"
              title={`${preset.size.width}x${preset.size.height}`}
            >
              {preset.icon}
              <span className="text-[9px] font-medium truncate w-full text-center group-hover:text-zinc-100">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
