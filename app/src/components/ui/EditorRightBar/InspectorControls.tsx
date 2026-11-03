import { createContext, useContext, type ReactNode } from "react";
import { Eye, EyeSlash, Minus, Plus } from "@phosphor-icons/react";
import ColorPickerPopover from "../ColorPickerPopover";
import type { BlendMode, EffectType, LayerEffect } from "../../editor-canvas/elementTypes";
import { BLEND_MODES } from "../../../lib/export/visualEffects";
import { NumberField, MIXED, type NumberFieldValue } from "./NumberField";

// ─── Document colors (provided once by DesignTab) ────────────────────────────

export const DocumentColorsContext = createContext<string[]>([]);

// ─── Layout primitives ───────────────────────────────────────────────────────

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider font-semibold">
        {children}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="p-5 border-b border-white/5">
      <SectionTitle action={action}>{title}</SectionTitle>
      {children}
    </div>
  );
}

// ─── Color field (popover with alpha + document colors + eyedropper) ────────

export function ColorField({
  value,
  onChange,
  ariaLabel,
  fallback = "#ffffff",
}: {
  value: string | undefined;
  onChange: (hex: string) => void;
  ariaLabel?: string;
  /** Shown when value is empty (e.g. no stroke yet). */
  fallback?: string;
}) {
  const documentColors = useContext(DocumentColorsContext);
  return (
    <ColorPickerPopover
      value={value || fallback}
      onChange={onChange}
      documentColors={documentColors}
      ariaLabel={ariaLabel}
    />
  );
}

// ─── Opacity (0–100 %) ───────────────────────────────────────────────────────

/** Opacity field displaying 0–100 % while storing 0–1. */
export function OpacityField({
  value,
  onCommit,
  onScrubStart,
}: {
  value: number | typeof MIXED | undefined;
  onCommit: (opacity01: number) => void;
  onScrubStart?: () => void;
}) {
  const pct: NumberFieldValue = value === MIXED ? MIXED : Math.round((value ?? 1) * 1000) / 10;
  return (
    <NumberField
      label="Op"
      ariaLabel="Opacity"
      value={pct}
      min={0}
      max={100}
      precision={1}
      suffix="%"
      onScrubStart={onScrubStart}
      onCommit={(v) => onCommit(Math.round(v * 10) / 1000)}
    />
  );
}

export function BlendModeSelect({
  value,
  onChange,
}: {
  value: BlendMode | undefined | typeof MIXED;
  onChange: (mode: BlendMode) => void;
}) {
  return (
    <select
      aria-label="Blend mode"
      value={value === MIXED ? "" : value ?? "normal"}
      onChange={(e) => onChange(e.target.value as BlendMode)}
      className="w-full bg-zinc-900 border border-white/5 rounded-md px-2 py-2 text-xs text-zinc-300 outline-none focus:border-blue-500/50 capitalize"
    >
      {value === MIXED && <option value="">Mixed</option>}
      {BLEND_MODES.map((m) => (
        <option key={m} value={m}>
          {m.replace("-", " ")}
        </option>
      ))}
    </select>
  );
}

/** "Layer" section: opacity (0–100 %) + blend mode. */
export function LayerSection({
  opacity,
  blendMode,
  update,
}: {
  opacity: number | undefined;
  blendMode: BlendMode | undefined;
  update: (u: { opacity?: number; blendMode?: BlendMode }) => void;
}) {
  return (
    <Section title="Layer">
      <div className="grid grid-cols-2 gap-2">
        <OpacityField value={opacity} onCommit={(o) => update({ opacity: o })} />
        <BlendModeSelect value={blendMode} onChange={(m) => update({ blendMode: m === "normal" ? undefined : m })} />
      </div>
    </Section>
  );
}

// ─── Effects list ─────────────────────────────────────────────────────────────

const EFFECT_LABELS: Record<EffectType, string> = {
  "drop-shadow": "Drop shadow",
  "inner-shadow": "Inner shadow",
  "layer-blur": "Layer blur",
};

let effectSeq = 0;
export function newEffectId(): string {
  effectSeq += 1;
  return `fx${Date.now().toString(36)}${effectSeq}`;
}

export function defaultEffect(type: EffectType = "drop-shadow"): LayerEffect {
  return {
    id: newEffectId(),
    type,
    visible: true,
    x: type === "layer-blur" ? 0 : 0,
    y: type === "layer-blur" ? 0 : 4,
    blur: type === "layer-blur" ? 4 : 8,
    spread: 0,
    color: "#00000040",
  };
}

export function EffectsSection({
  effects,
  onChange,
}: {
  effects: LayerEffect[] | undefined;
  onChange: (effects: LayerEffect[] | undefined) => void;
}) {
  const list = effects ?? [];
  const set = (next: LayerEffect[]) => onChange(next.length > 0 ? next : undefined);
  const patch = (id: string, u: Partial<LayerEffect>) =>
    set(list.map((e) => (e.id === id ? { ...e, ...u } : e)));

  return (
    <Section
      title="Effects"
      action={
        <button
          type="button"
          aria-label="Add effect"
          title="Add effect"
          onClick={() => set([...list, defaultEffect()])}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      }
    >
      {list.length === 0 ? (
        <p className="text-[11px] text-zinc-600">No effects</p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((fx) => (
            <div key={fx.id} className="flex flex-col gap-2" data-testid="effect-row">
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Effect type"
                  value={fx.type}
                  onChange={(e) => patch(fx.id, { type: e.target.value as EffectType })}
                  className="flex-1 bg-zinc-900 border border-white/5 rounded-md px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-blue-500/50"
                >
                  {(Object.keys(EFFECT_LABELS) as EffectType[]).map((t) => (
                    <option key={t} value={t}>{EFFECT_LABELS[t]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={fx.visible ? "Hide effect" : "Show effect"}
                  onClick={() => patch(fx.id, { visible: !fx.visible })}
                  className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                >
                  {fx.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeSlash className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  aria-label="Remove effect"
                  onClick={() => set(list.filter((e) => e.id !== fx.id))}
                  className="p-1.5 rounded text-zinc-500 hover:text-red-300 hover:bg-white/5"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
              {fx.type === "layer-blur" ? (
                <NumberField label="Blur" value={fx.blur} min={0} max={250} onCommit={(v) => patch(fx.id, { blur: v })} />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="X" ariaLabel="Shadow X" value={fx.x} onCommit={(v) => patch(fx.id, { x: v })} />
                    <NumberField label="Y" ariaLabel="Shadow Y" value={fx.y} onCommit={(v) => patch(fx.id, { y: v })} />
                    <NumberField label="B" ariaLabel="Shadow blur" value={fx.blur} min={0} max={250} onCommit={(v) => patch(fx.id, { blur: v })} />
                    <NumberField label="S" ariaLabel="Shadow spread" value={fx.spread ?? 0} min={-100} max={100} onCommit={(v) => patch(fx.id, { spread: v })} />
                  </div>
                  <ColorField value={fx.color} onChange={(c) => patch(fx.id, { color: c })} ariaLabel="Shadow color" />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
