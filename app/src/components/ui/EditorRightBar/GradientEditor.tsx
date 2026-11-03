import type { GradientFill, GradientStop } from "../../../lib/editor/gradient";
import { gradientToCss, sortGradientStops } from "../../../lib/editor/gradient";
import { NumberField } from "./NumberField";
import { ColorField } from "./InspectorControls";

// ─── Gradient Editor ────────────────────────────────────────────────────────────

interface GradientEditorProps {
  gradient: GradientFill;
  onChange: (g: GradientFill) => void;
}

type IdStop = GradientStop & { id?: string };

let stopSeq = 0;
const newStopId = () => `s${Date.now().toString(36)}${++stopSeq}`;

/** Every stop gets a stable id (list key) and the list is kept sorted by
 *  offset, so the editor rows, preview and export all agree. */
function normalizeStops(stops: IdStop[]): IdStop[] {
  return sortGradientStops(stops.map((s) => (s.id ? s : { ...s, id: newStopId() })));
}

function GradientEditor({ gradient, onChange }: GradientEditorProps) {
  const stops = gradient.stops as IdStop[];
  const commitStops = (next: IdStop[]) => onChange({ ...gradient, stops: normalizeStops(next) } as GradientFill);
  const patchStop = (i: number, u: Partial<GradientStop>) =>
    commitStops(stops.map((s, j) => (j === i ? { ...s, ...u } : s)));

  return (
    <div className="flex flex-col gap-3">
      {/* Type toggle */}
      <div className="flex border border-white/5 rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => onChange({ type: "linear", angle: 135, stops: normalizeStops(stops) })}
          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
            gradient.type === "linear" ? "bg-blue-600/20 text-blue-400" : "bg-zinc-900 text-zinc-500"
          }`}
        >
          Linear
        </button>
        <button
          type="button"
          onClick={() => onChange({ type: "radial", cx: 0.5, cy: 0.5, stops: normalizeStops(stops) })}
          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
            gradient.type === "radial" ? "bg-blue-600/20 text-blue-400" : "bg-zinc-900 text-zinc-500"
          }`}
        >
          Radial
        </button>
      </div>

      {/* Angle (linear only) — 0° = left→right, same convention as export */}
      {gradient.type === "linear" && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={360}
            value={gradient.angle}
            aria-label="Gradient angle slider"
            onChange={(e) => onChange({ ...gradient, angle: Number(e.target.value) })}
            className="flex-1 h-1 accent-blue-500"
          />
          <div className="w-24">
            <NumberField
              label="∠"
              ariaLabel="Gradient angle"
              suffix="°"
              value={gradient.angle}
              onCommit={(v) => onChange({ ...gradient, angle: ((v % 360) + 360) % 360 })}
            />
          </div>
        </div>
      )}

      {/* Preview bar — matches the exported SVG gradient */}
      <div
        className="h-4 rounded border border-white/10"
        data-testid="gradient-preview"
        style={{ background: gradientToCss(gradient) }}
      />

      {/* Stops (sorted by offset; stable keys) */}
      <div className="flex flex-col gap-1.5">
        {stops.map((stop, i) => (
          <div key={stop.id ?? `stop-${i}`} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <ColorField value={stop.color} onChange={(hex) => patchStop(i, { color: hex })} ariaLabel={`Stop ${i + 1} color`} />
            </div>
            <div className="w-20">
              <NumberField
                label="%"
                ariaLabel={`Stop ${i + 1} position`}
                value={Math.round(stop.offset * 1000) / 10}
                min={0}
                max={100}
                precision={1}
                onCommit={(v) => patchStop(i, { offset: v / 100 })}
              />
            </div>
            {stops.length > 2 && (
              <button
                type="button"
                aria-label={`Remove stop ${i + 1}`}
                onClick={() => commitStops(stops.filter((_, j) => j !== i))}
                className="text-zinc-600 hover:text-red-400 text-xs"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add stop */}
      {stops.length < 5 && (
        <button
          type="button"
          onClick={() => commitStops([...stops, { offset: 0.5, color: "#ffffff", id: newStopId() }])}
          className="text-xs text-zinc-500 hover:text-zinc-300 py-1 border border-dashed border-white/10 hover:border-white/20 rounded transition-colors"
        >
          + Add stop
        </button>
      )}
    </div>
  );
}

export default GradientEditor;
