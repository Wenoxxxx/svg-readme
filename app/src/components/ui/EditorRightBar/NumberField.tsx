import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { evaluateNumberExpression } from "./numberExpr";

export const MIXED = "mixed" as const;
export type NumberFieldValue = number | typeof MIXED;

export interface NumberFieldProps {
  /** Short label (e.g. "X", "W") or icon; dragging it scrubs the value. */
  label: ReactNode;
  value: NumberFieldValue;
  /** Called with the committed (clamped, rounded) number. */
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  /** Arrow-key / scrub step (Shift multiplies by 10). Default 1. */
  step?: number;
  /** Decimal places kept on commit and display. Default 2. */
  precision?: number;
  /** Optional unit shown after the value (e.g. "%", "°"). */
  suffix?: string;
  /** Accessible label for the input. */
  ariaLabel?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  /** Fired once when a scrub gesture begins (e.g. to open an undo checkpoint). */
  onScrubStart?: () => void;
}

const round = (n: number, p: number) => {
  const f = 10 ** p;
  return Math.round(n * f) / f;
};

export function formatNumber(n: number, precision = 2): string {
  return String(round(n, precision));
}

/**
 * Figma-style numeric inspector field.
 * - Edits a draft string; commits on Enter / blur, Esc reverts.
 * - Accepts partial input ("-", ".") while typing and safe arithmetic
 *   expressions ("100/2+4"), evaluated without eval().
 * - ArrowUp / ArrowDown step ±step (Shift ×10) and commit immediately.
 * - Drag the label horizontally to scrub (pointer capture, Shift ×10).
 * - Shows "Mixed" for multi-selections with differing values.
 */
export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  precision = 2,
  suffix,
  ariaLabel,
  title,
  disabled,
  className,
  onScrubStart,
}: NumberFieldProps) {
  const display = value === MIXED ? "" : formatNumber(value, precision);
  // Draft text exists only while the input is focused; otherwise the field
  // always mirrors the external value.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? display;
  const scrub = useRef<{ startX: number; startValue: number; moved: boolean } | null>(null);
  const skipBlurCommit = useRef(false);

  const clamp = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return round(v, precision);
  };

  /** Commit the draft; invalid / partial input ("-", ".") reverts. */
  const commitDraft = (keepEditing: boolean) => {
    const parsed = evaluateNumberExpression(text);
    if (parsed === null) {
      setDraft(keepEditing ? display : null);
      return;
    }
    const next = clamp(parsed);
    setDraft(keepEditing ? formatNumber(next, precision) : null);
    if (value === MIXED || next !== value) onCommit(next);
  };

  const blurWithoutCommit = (el: HTMLInputElement) => {
    if (typeof document !== "undefined" && document.activeElement === el) {
      skipBlurCommit.current = true;
      el.blur();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft(false);
      blurWithoutCommit(e.target as HTMLInputElement);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(null);
      blurWithoutCommit(e.target as HTMLInputElement);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const base = evaluateNumberExpression(text) ?? (value === MIXED ? 0 : value);
      const delta = (e.shiftKey ? step * 10 : step) * (e.key === "ArrowUp" ? 1 : -1);
      const next = clamp(base + delta);
      setDraft(formatNumber(next, precision));
      onCommit(next);
    }
  };

  const onLabelPointerDown = (e: PointerEvent<HTMLSpanElement>) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    scrub.current = { startX: e.clientX, startValue: value === MIXED ? 0 : value, moved: false };
  };
  const onLabelPointerMove = (e: PointerEvent<HTMLSpanElement>) => {
    const s = scrub.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    if (!s.moved) {
      if (Math.abs(dx) < 2) return;
      s.moved = true;
      onScrubStart?.();
    }
    const next = clamp(s.startValue + Math.round(dx) * step * (e.shiftKey ? 10 : 1));
    onCommit(next);
  };
  const onLabelPointerUp = (e: PointerEvent<HTMLSpanElement>) => {
    if (!scrub.current) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    scrub.current = null;
  };

  return (
    <div
      className={
        className ??
        "flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-md px-3 py-2.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all"
      }
      title={title}
    >
      <span
        className="text-zinc-500 text-xs font-mono select-none cursor-ew-resize touch-none"
        data-testid="number-field-scrub"
        onPointerDown={onLabelPointerDown}
        onPointerMove={onLabelPointerMove}
        onPointerUp={onLabelPointerUp}
        onPointerCancel={onLabelPointerUp}
      >
        {label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
        value={text}
        placeholder={value === MIXED ? "Mixed" : undefined}
        disabled={disabled}
        onFocus={(e) => {
          setDraft(display);
          e.target.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (skipBlurCommit.current) {
            skipBlurCommit.current = false;
            setDraft(null);
            return;
          }
          commitDraft(false);
        }}
        onKeyDown={onKeyDown}
        className="bg-transparent text-sm w-full min-w-0 outline-none text-zinc-300 focus:text-white placeholder:text-zinc-500"
      />
      {suffix && <span className="text-zinc-500 text-xs">{suffix}</span>}
    </div>
  );
}

export default NumberField;
