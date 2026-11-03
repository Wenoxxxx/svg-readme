import { useState } from "react";
import { LinkSimple, LinkBreak } from "@phosphor-icons/react";
import type { ShapeElementProperties, ElementProperties } from "../../editor-canvas/ElementsRenderer";
import type { StrokePosition } from "../../editor-canvas/elementTypes";
import { isGradient, GRADIENT_PRESETS, gradientToCss } from "../../../lib/editor/gradient";
import { DEFAULT_RECT_CORNER_RADIUS, resolveCornerRadii, radiiAreUniform } from "../../../lib/export/visualEffects";
import AlignmentControls from "./AlignmentControls";
import GradientEditor from "./GradientEditor";
import { NumberField } from "./NumberField";
import { ColorField, Section } from "./InspectorControls";

interface DesignTabShapeProps {
  selectedProps: ShapeElementProperties;
  update: (updates: Partial<ElementProperties>) => void;
  onPropertiesStart?: () => void;
  onMoveElement?: (id: string, x: number, y: number) => void;
  onAlignmentStart?: () => void;
  allElementProperties?: Record<string, ElementProperties>;
  allSelectedLayerIds?: string[];
  frameBounds?: { x: number; y: number; width: number; height: number } | null;
}

const CORNER_LABELS = ["TL", "TR", "BR", "BL"] as const;

/** Stroke cap / join / dash controls shared by shapes and paths. */
export function StrokeStyleControls({
  strokeDashArray,
  strokeLinecap,
  strokeLinejoin,
  defaultCap,
  defaultJoin,
  update,
}: {
  strokeDashArray?: string;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
  defaultCap: "butt" | "round" | "square";
  defaultJoin: "miter" | "round" | "bevel";
  update: (u: { strokeDashArray?: string; strokeLinecap?: "butt" | "round" | "square"; strokeLinejoin?: "miter" | "round" | "bevel" }) => void;
}) {
  const parts = (strokeDashArray ?? "6 3").split(/[\s,]+/);
  const setPart = (i: number, v: number) => {
    const next = [...parts];
    next[i] = String(v);
    update({ strokeDashArray: next.slice(0, 2).join(" ") });
  };
  return (
    <>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => update({ strokeDashArray: strokeDashArray ? undefined : "6 3" })}
          title={strokeDashArray ? "Remove dash" : "Add dash pattern"}
          className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
            strokeDashArray ? "bg-blue-600/20 text-blue-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-white/5"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="2" y1="8" x2="6" y2="8" /><line x1="9" y1="8" x2="13" y2="8" />
          </svg>
          <span>Dash</span>
        </button>
        {strokeDashArray && (
          <>
            <NumberField label="D" ariaLabel="Dash length" value={Number(parts[0]) || 6} min={1} onCommit={(v) => setPart(0, v)} />
            <NumberField label="G" ariaLabel="Dash gap" value={Number(parts[1] ?? parts[0]) || 3} min={1} onCommit={(v) => setPart(1, v)} />
          </>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <div className="flex-1">
          <span className="text-[9px] text-zinc-500 font-mono block mb-1">Cap</span>
          <select
            aria-label="Stroke cap"
            value={strokeLinecap ?? defaultCap}
            onChange={(e) => update({ strokeLinecap: e.target.value as "butt" | "round" | "square" })}
            className="w-full bg-zinc-900 border border-white/5 rounded-md px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-blue-500/50"
          >
            <option value="butt">Butt</option>
            <option value="round">Round</option>
            <option value="square">Square</option>
          </select>
        </div>
        <div className="flex-1">
          <span className="text-[9px] text-zinc-500 font-mono block mb-1">Join</span>
          <select
            aria-label="Stroke join"
            value={strokeLinejoin ?? defaultJoin}
            onChange={(e) => update({ strokeLinejoin: e.target.value as "miter" | "round" | "bevel" })}
            className="w-full bg-zinc-900 border border-white/5 rounded-md px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-blue-500/50"
          >
            <option value="miter">Miter</option>
            <option value="round">Round</option>
            <option value="bevel">Bevel</option>
          </select>
        </div>
      </div>
    </>
  );
}

export function DesignTabShape({
  selectedProps,
  update,
  onMoveElement,
  onAlignmentStart,
  allElementProperties,
  allSelectedLayerIds,
  frameBounds,
}: DesignTabShapeProps) {
  const radii = resolveCornerRadii(selectedProps);
  const [independent, setIndependent] = useState(() => !radiiAreUniform(radii));
  const supportsStrokePosition = selectedProps.kind === "rect" || selectedProps.kind === "circle";

  return (
    <>
      {/* Appearance — corner radius for rect shapes */}
      {selectedProps.kind === "rect" && (
        <Section
          title="Appearance"
          action={
            <button
              type="button"
              aria-label={independent ? "Link corner radii" : "Independent corner radii"}
              aria-pressed={independent}
              title={independent ? "Use one radius for all corners" : "Set each corner independently"}
              onClick={() => {
                if (independent) {
                  update({ cornerRadius: radii[0], cornerRadii: undefined });
                } else {
                  update({ cornerRadii: [...radii] as [number, number, number, number] });
                }
                setIndependent(!independent);
              }}
              className={`p-1 rounded ${independent ? "text-blue-400 bg-blue-600/20" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"}`}
            >
              {independent ? <LinkBreak className="w-3.5 h-3.5" /> : <LinkSimple className="w-3.5 h-3.5" />}
            </button>
          }
        >
          {independent ? (
            <div className="grid grid-cols-2 gap-2">
              {CORNER_LABELS.map((label, i) => (
                <NumberField
                  key={label}
                  label={label}
                  ariaLabel={`Corner radius ${label}`}
                  value={radii[i]}
                  min={0}
                  onCommit={(v) => {
                    const next = [...radii] as [number, number, number, number];
                    next[i] = v;
                    update({ cornerRadii: next });
                  }}
                />
              ))}
            </div>
          ) : (
            <NumberField
              label="Rd"
              ariaLabel="Corner radius"
              value={selectedProps.cornerRadius ?? DEFAULT_RECT_CORNER_RADIUS}
              min={0}
              onCommit={(v) => update({ cornerRadius: v, cornerRadii: undefined })}
            />
          )}
        </Section>
      )}

      <AlignmentControls
        ids={allSelectedLayerIds?.filter((id) => allElementProperties?.[id]) ?? []}
        allElementProperties={allElementProperties ?? {}}
        onMoveElement={onMoveElement ?? (() => undefined)}
        onAlignmentStart={onAlignmentStart}
        frameBounds={frameBounds}
      />

      {/* Fill */}
      <Section
        title="Fill"
        action={
          isGradient(selectedProps.fill) ? (
            <button
              type="button"
              onClick={() => update({ fill: "#8b5cf6" })}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono uppercase tracking-wider transition-colors"
            >
              Solid
            </button>
          ) : undefined
        }
      >
        {isGradient(selectedProps.fill) ? (
          <GradientEditor
            gradient={selectedProps.fill}
            onChange={(g) => update({ fill: g as unknown as string })}
          />
        ) : (
          <>
            <ColorField value={selectedProps.fill as string} onChange={(hex) => update({ fill: hex })} ariaLabel="Fill color" />
            <div className="mt-3 pt-3 border-t border-white/5">
              <span className="text-[9px] text-zinc-500 font-mono block mb-2">Gradient Presets</span>
              <div className="grid grid-cols-3 gap-1.5">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => update({ fill: preset.gradient as unknown as string })}
                    className="h-8 rounded border border-white/5 hover:border-white/20 transition-colors text-[9px] text-zinc-400 hover:text-zinc-200 flex items-center justify-center overflow-hidden"
                    style={{ background: gradientToCss(preset.gradient) }}
                    title={preset.name}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Section>

      {/* Stroke */}
      <Section title="Stroke">
        <div className="mb-2">
          <ColorField value={selectedProps.stroke} onChange={(hex) => update({ stroke: hex })} ariaLabel="Stroke color" />
        </div>
        <div className={supportsStrokePosition ? "grid grid-cols-2 gap-2" : ""}>
          <NumberField
            label="Wt"
            ariaLabel="Stroke width"
            value={selectedProps.strokeWidth}
            min={0}
            onCommit={(v) => update({ strokeWidth: v })}
          />
          {supportsStrokePosition && (
            <select
              aria-label="Stroke position"
              value={selectedProps.strokePosition ?? "center"}
              onChange={(e) => update({ strokePosition: e.target.value as StrokePosition })}
              className="w-full bg-zinc-900 border border-white/5 rounded-md px-2 py-2 text-xs text-zinc-300 outline-none focus:border-blue-500/50"
            >
              <option value="center">Center</option>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
            </select>
          )}
        </div>
        <StrokeStyleControls
          strokeDashArray={selectedProps.strokeDashArray}
          strokeLinecap={selectedProps.strokeLinecap}
          strokeLinejoin={selectedProps.strokeLinejoin}
          defaultCap="butt"
          defaultJoin="miter"
          update={update}
        />
      </Section>
    </>
  );
}
