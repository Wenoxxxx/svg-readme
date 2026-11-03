import { FlipHorizontal, FlipVertical } from "@phosphor-icons/react";
import type { ElementProperties } from "../../editor-canvas/ElementsRenderer";
import { getElementBoundingBox } from "../../editor-canvas/ElementsRenderer";
import { isGradient } from "../../../lib/editor/gradient";
import { NumberField, MIXED, type NumberFieldValue } from "./NumberField";
import { ColorField, OpacityField } from "./InspectorControls";

// ─── Multi-edit (B10) ────────────────────────────────────────────────────────

type UpdateMany = (updates: Record<string, Partial<ElementProperties>>) => void;

/** Union bounds of the selection. */
export function selectionBounds(propsList: ElementProperties[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of propsList) {
    const b = getElementBoundingBox(p);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Per-layer updates that move/scale every selected element so the selection's
 * bounding box becomes `next`. Shapes and images are scaled; text and paths
 * (whose geometry is content-driven) are only repositioned proportionally.
 */
export function boundsEditUpdates(
  ids: string[],
  all: Record<string, ElementProperties>,
  next: { x: number; y: number; width: number; height: number },
): Record<string, Partial<ElementProperties>> {
  const list = ids.map((id) => all[id]).filter(Boolean);
  const cur = selectionBounds(list);
  const sx = cur.width > 0 ? next.width / cur.width : 1;
  const sy = cur.height > 0 ? next.height / cur.height : 1;
  const out: Record<string, Partial<ElementProperties>> = {};
  for (const id of ids) {
    const p = all[id];
    if (!p) continue;
    const b = getElementBoundingBox(p);
    const nx = next.x + (b.x - cur.x) * sx;
    const ny = next.y + (b.y - cur.y) * sy;
    // Element x/y may differ from its visual box (e.g. stroke, text): keep the offset.
    const u: Record<string, unknown> = { x: p.x + (nx - b.x), y: p.y + (ny - b.y) };
    if ((p.type === "shape" || p.type === "image") && (sx !== 1 || sy !== 1)) {
      u.width = Math.max(1, (p.width as number) * sx);
      u.height = Math.max(1, p.height * sy);
    }
    out[id] = u as Partial<ElementProperties>;
  }
  return out;
}

/**
 * Bulk property editing for multi-selections (B10). Controls appear based on
 * the union of editable fields across the selection; values that differ show
 * as "Mixed". Per-layer edits (bounds, flips, type-aware fill) go through
 * `onUpdateMany` so they land as a single undo step.
 */
function MultiEditControls({
  ids,
  allElementProperties,
  onBulkUpdateProperties,
  onUpdateMany,
  onPropertiesStart,
}: {
  ids: string[];
  allElementProperties: Record<string, ElementProperties>;
  onBulkUpdateProperties?: (updates: Partial<ElementProperties>) => void;
  onUpdateMany?: UpdateMany;
  onPropertiesStart?: () => void;
}) {
  const propsList = ids
    .map((id) => allElementProperties[id])
    .filter((p): p is ElementProperties => !!p);
  if (propsList.length === 0 || !onBulkUpdateProperties) return null;

  const hasFill = propsList.some(
    (p) => p.type === "shape" || p.type === "path" || p.type === "text",
  );
  const hasStroke = propsList.some(
    (p) => p.type === "shape" || p.type === "path",
  );
  const flippable = ids.filter((id) => {
    const t = allElementProperties[id]?.type;
    return t === "shape" || t === "image";
  });
  const allText = propsList.every((p) => p.type === "text");

  // Shared value when every relevant layer agrees, otherwise MIXED.
  const common = <T,>(pick: (p: ElementProperties) => T | undefined): T | typeof MIXED => {
    const vals = propsList.map(pick).filter((v): v is T => v !== undefined);
    if (vals.length === 0) return MIXED;
    return vals.every((v) => v === vals[0]) ? vals[0] : MIXED;
  };

  const opacity = common((p) => p.opacity ?? 1);
  // Gradients never count as a shared solid color (and are never shown as hex).
  const fill = common<string>((p) => {
    if (p.type === "shape" || p.type === "path") return isGradient(p.fill as never) ? "\u0000gradient" : (p.fill as string);
    if (p.type === "text") return p.color;
    return undefined;
  });
  const solidFill = fill === MIXED || fill === "\u0000gradient" ? undefined : fill;
  const stroke = common((p) =>
    p.type === "shape" || p.type === "path" ? (p.stroke as string) : undefined,
  );
  const strokeWidth = common((p) =>
    p.type === "shape" || p.type === "path" ? p.strokeWidth : undefined,
  );
  const fontSize = common((p) => (p.type === "text" ? p.fontSize : undefined));

  const bounds = selectionBounds(propsList);
  const editBounds = (patch: Partial<typeof bounds>) => {
    if (!onUpdateMany) return;
    onUpdateMany(boundsEditUpdates(ids, allElementProperties, { ...bounds, ...patch }));
  };

  /** Fill → shapes/paths `fill`, text `color`; images untouched. */
  const applyFill = (hex: string) => {
    if (!onUpdateMany) {
      onBulkUpdateProperties({ fill: hex } as Partial<ElementProperties>);
      return;
    }
    const u: Record<string, Partial<ElementProperties>> = {};
    for (const id of ids) {
      const p = allElementProperties[id];
      if (!p) continue;
      if (p.type === "text") u[id] = { color: hex } as Partial<ElementProperties>;
      else if (p.type === "shape" || p.type === "path") u[id] = { fill: hex } as Partial<ElementProperties>;
    }
    onUpdateMany(u);
  };
  const applyStroke = (u: { stroke?: string; strokeWidth?: number }) => {
    if (!onUpdateMany) {
      onBulkUpdateProperties(u as Partial<ElementProperties>);
      return;
    }
    const out: Record<string, Partial<ElementProperties>> = {};
    for (const id of ids) {
      const t = allElementProperties[id]?.type;
      if (t === "shape" || t === "path") out[id] = u as Partial<ElementProperties>;
    }
    onUpdateMany(out);
  };
  const toggleFlip = (key: "flipH" | "flipV") => {
    if (!onUpdateMany) return;
    const out: Record<string, Partial<ElementProperties>> = {};
    for (const id of flippable) {
      const p = allElementProperties[id] as { flipH?: boolean; flipV?: boolean };
      out[id] = { [key]: !p[key] } as Partial<ElementProperties>;
    }
    onUpdateMany(out);
  };

  const label = "text-[11px] font-[JetBrains_Mono] text-zinc-500 uppercase tracking-wider";
  const nf = (v: NumberFieldValue) => v;

  return (
    <div className="flex flex-col gap-4">
      {onUpdateMany && (
        <div className="flex flex-col gap-1.5">
          <span className={label}>Selection</span>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="X" ariaLabel="Selection X" value={bounds.x} onCommit={(v) => editBounds({ x: v })} onScrubStart={onPropertiesStart} />
            <NumberField label="Y" ariaLabel="Selection Y" value={bounds.y} onCommit={(v) => editBounds({ y: v })} onScrubStart={onPropertiesStart} />
            <NumberField label="W" ariaLabel="Selection W" value={bounds.width} min={1} onCommit={(v) => editBounds({ width: v })} onScrubStart={onPropertiesStart} />
            <NumberField label="H" ariaLabel="Selection H" value={bounds.height} min={1} onCommit={(v) => editBounds({ height: v })} onScrubStart={onPropertiesStart} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className={label}>Opacity</span>
        <div aria-label="Bulk opacity group">
          <OpacityFieldLabeled value={nf(opacity)} onCommit={(o) => onBulkUpdateProperties({ opacity: o } as Partial<ElementProperties>)} />
        </div>
      </div>

      {hasFill && (
        <div className="flex flex-col gap-1.5">
          <span className={label}>
            Fill / Text color{solidFill === undefined && <span className="ml-2 normal-case text-zinc-600">Mixed</span>}
          </span>
          <ColorField value={solidFill} fallback="#8b5cf6" onChange={applyFill} ariaLabel="Bulk fill color" />
        </div>
      )}

      {hasStroke && (
        <div className="flex flex-col gap-1.5">
          <span className={label}>
            Stroke{stroke === MIXED && <span className="ml-2 normal-case text-zinc-600">Mixed</span>}
          </span>
          <ColorField value={stroke === MIXED ? undefined : stroke} onChange={(hex) => applyStroke({ stroke: hex })} ariaLabel="Bulk stroke color" />
          <NumberField label="Wt" ariaLabel="Bulk stroke width" value={strokeWidth} min={0} onCommit={(v) => applyStroke({ strokeWidth: v })} />
        </div>
      )}

      {allText && (
        <NumberField
          label="Size"
          ariaLabel="Bulk font size"
          value={fontSize}
          min={1}
          onCommit={(v) => onBulkUpdateProperties({ fontSize: v } as Partial<ElementProperties>)}
        />
      )}

      {flippable.length > 0 && onUpdateMany && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 font-mono mr-1">Flip</span>
          <button
            type="button"
            onClick={() => toggleFlip("flipH")}
            className="p-1.5 rounded text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            title="Flip Horizontal (all selected)"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => toggleFlip("flipV")}
            className="p-1.5 rounded text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            title="Flip Vertical (all selected)"
          >
            <FlipVertical className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** OpacityField with the multi-edit aria label. */
function OpacityFieldLabeled(props: { value: NumberFieldValue; onCommit: (o: number) => void }) {
  const pct: NumberFieldValue = props.value === MIXED ? MIXED : Math.round(props.value * 1000) / 10;
  return (
    <NumberField
      label="Op"
      ariaLabel="Bulk opacity"
      value={pct}
      min={0}
      max={100}
      precision={1}
      suffix="%"
      onCommit={(v) => props.onCommit(Math.round(v * 10) / 1000)}
    />
  );
}

// Re-exported for tests / other panels.
export { OpacityField };

export default MultiEditControls;
