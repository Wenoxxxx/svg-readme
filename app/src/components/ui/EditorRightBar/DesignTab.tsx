import { useMemo, useState } from "react";
import {
  FlipHorizontal,
  FlipVertical,
  ArrowsOutCardinal,
  FolderOpen,
  TextT as TypeIcon,
  Square as SquareIcon,
  Image as ImageIcon,
  LineSegment as LineIcon,
  LinkSimple,
  LinkBreak,
} from "@phosphor-icons/react";
import type { ElementProperties } from "../../editor-canvas/ElementsRenderer";
import { getElementBoundingBox } from "../../editor-canvas/ElementsRenderer";
import { useEditor } from "../../../context/EditorContext";
import { collectDocumentColors } from "../../../lib/color";
import CanvasSettingsPanel from "./CanvasSettingsPanel";
import AlignmentControls from "./AlignmentControls";
import MultiEditControls from "./MultiEditControls";
import GroupBoundsPanel from "./GroupBoundsPanel";
import { DesignTabText } from "./DesignTabText";
import { DesignTabShape, StrokeStyleControls } from "./DesignTabShape";
import { NumberField } from "./NumberField";
import { ColorField, DocumentColorsContext, EffectsSection, LayerSection, Section } from "./InspectorControls";

// ─── Design Tab ───────────────────────────────────────────────────────────────

interface DesignTabProps {
  selectedId: string | null;
  selectedProps: ElementProperties | null;
  onUpdateProperties?: (id: string, updates: Partial<ElementProperties>) => void;
  onBulkUpdateProperties?: (updates: Partial<ElementProperties>) => void;
  /** Per-layer bulk update (multi-select geometry edits). */
  onUpdateMany?: (updates: Record<string, Partial<ElementProperties>>) => void;
  onPropertiesStart?: () => void;
  /** Fired before a canvas (frame) resize so the change lands in undo history. */
  onCanvasResizeStart?: () => void;
  onMoveElement?: (id: string, x: number, y: number) => void;
  onAlignmentStart?: () => void;
  multiSelectCount: number;
  allElementProperties?: Record<string, ElementProperties>;
  allSelectedLayerIds?: string[];
  /** Canvas size — used to align a single layer to the frame (B7). */
  frameSize?: { width: number; height: number };
}

/** Ids of every descendant layer that carries element properties. */
function descendantElementIds(
  groupId: string,
  layers: { id: string; parentId?: string | null }[],
  allElementProperties: Record<string, ElementProperties>,
): string[] {
  const out: string[] = [];
  const walk = (pid: string) => {
    for (const l of layers) {
      if (l.parentId !== pid) continue;
      if (allElementProperties[l.id]) out.push(l.id);
      walk(l.id);
    }
  };
  walk(groupId);
  return out;
}

function DesignTab({
  selectedId,
  selectedProps,
  onUpdateProperties,
  onBulkUpdateProperties,
  onUpdateMany,
  onPropertiesStart,
  onCanvasResizeStart,
  onMoveElement,
  onAlignmentStart,
  multiSelectCount,
  allElementProperties,
  allSelectedLayerIds,
  frameSize,
}: DesignTabProps) {
  const { layers } = useEditor();
  const [lockRatio, setLockRatio] = useState(false);
  const documentColors = useMemo(
    () => collectDocumentColors(allElementProperties ?? {}),
    [allElementProperties],
  );

  // Shared alignment target: the frame when a single layer is selected (so it
  // can be aligned to the canvas), or null for multi-selection (selection-relative).
  const frameBounds = frameSize
    ? { x: 0, y: 0, width: frameSize.width, height: frameSize.height }
    : null;

  const provide = (node: React.ReactNode) => (
    <DocumentColorsContext.Provider value={documentColors}>{node}</DocumentColorsContext.Provider>
  );

  if (multiSelectCount > 1) {
    const ids = allSelectedLayerIds?.filter((id) => allElementProperties?.[id]) ?? [];
    return provide(
      <div className="p-5 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center">
            <ArrowsOutCardinal className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-300">Multiple Selection</h3>
            <p className="text-xs text-zinc-500">{multiSelectCount} layers selected</p>
          </div>
        </div>
        <MultiEditControls
          ids={ids}
          allElementProperties={allElementProperties ?? {}}
          onBulkUpdateProperties={onBulkUpdateProperties}
          onUpdateMany={onUpdateMany}
          onPropertiesStart={onPropertiesStart}
        />
        {allElementProperties && onMoveElement && (
          <AlignmentControls
            ids={ids}
            allElementProperties={allElementProperties}
            onMoveElement={onMoveElement}
            onAlignmentStart={onAlignmentStart}
          />
        )}
      </div>,
    );
  }

  if (!selectedId || !selectedProps) {
    // Check if a group is selected (groups have no elementProperties)
    const selectedLayer = layers?.find((l) => l.id === selectedId);
    if (selectedLayer && selectedLayer.type === "group") {
      const childCount = layers?.filter((l) => l.parentId === selectedLayer.id).length ?? 0;
      // Groups carry no geometry of their own: align/move every descendant
      // element so the group moves as a unit.
      const groupIds = allElementProperties
        ? descendantElementIds(selectedLayer.id, layers ?? [], allElementProperties)
        : [];
      const groupMove =
        onMoveElement && allElementProperties && groupIds.length > 0
          ? (_id: string, x: number, y: number) => {
              // The alignment helper passes the group's virtual item id; move
              // all descendants by the same delta.
              const box = groupBounds(groupIds, allElementProperties);
              const dx = x - box.x;
              const dy = y - box.y;
              if (dx === 0 && dy === 0) return;
              for (const id of groupIds) {
                const p = allElementProperties[id];
                onMoveElement(id, p.x + dx, p.y + dy);
              }
            }
          : undefined;
      const groupProps: Record<string, ElementProperties> | null =
        allElementProperties && groupIds.length > 0
          ? { [selectedLayer.id]: virtualGroupRect(groupIds, allElementProperties) }
          : null;
      return provide(
        <div className="p-5 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-300">{selectedLayer.name}</h3>
              <p className="text-xs text-zinc-500">
                Group · {childCount} child{childCount !== 1 ? "ren" : ""}
              </p>
            </div>
          </div>
          {allElementProperties && (
            <GroupBoundsPanel
              groupId={selectedLayer.id}
              layers={layers ?? []}
              allElementProperties={allElementProperties}
            />
          )}
          {groupProps && groupMove && (
            <AlignmentControls
              ids={[selectedLayer.id]}
              allElementProperties={groupProps}
              onMoveElement={groupMove}
              onAlignmentStart={onAlignmentStart}
              frameBounds={frameBounds}
            />
          )}
        </div>,
      );
    }

    // Nothing (or no editable layer) selected → Canvas settings home.
    return <CanvasSettingsPanel onCanvasResizeStart={onCanvasResizeStart} />;
  }

  const update = (updates: Partial<ElementProperties>) =>
    onUpdateProperties?.(selectedId, updates);

  const selectedLayer = layers?.find((l) => l.id === selectedId);

  // ── Selection header: layer type icon + name + type badge (B10) ────────
  const layerIcon = () => {
    switch (selectedLayer?.type) {
      case "text": return <TypeIcon className="w-4 h-4 text-zinc-400" />;
      case "image": return <ImageIcon className="w-4 h-4 text-zinc-400" />;
      case "group": return <FolderOpen className="w-4 h-4 text-zinc-400" />;
      case "shape": return selectedProps.type === "path"
        ? <LineIcon className="w-4 h-4 text-zinc-400" />
        : <SquareIcon className="w-4 h-4 text-zinc-400" />;
      default: return <ArrowsOutCardinal className="w-4 h-4 text-zinc-400" />;
    }
  };
  const typeLabel = selectedProps.type === "path"
    ? "Path"
    : (selectedLayer?.type ?? selectedProps.type);
  const selectionHeader = (
    <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/5">
      <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center shrink-0">
        {layerIcon()}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-zinc-200 truncate">
          {selectedLayer?.name ?? "Layer"}
        </h3>
        <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
          {typeLabel}
        </p>
      </div>
    </div>
  );

  // ── Common Layout Section (all types have x, y, width, height) ────────
  const box = getElementBoundingBox(selectedProps);
  const curW = typeof selectedProps.width === "number" ? selectedProps.width : box.width;
  const curH = selectedProps.height;
  const isText = selectedProps.type === "text";
  const textMode = isText ? (selectedProps.textAutoResize ?? "WIDTH_AND_HEIGHT") : null;

  const commitWidth = (w: number) => {
    if (w <= 0) return;
    const u: Record<string, unknown> = { width: w };
    if (lockRatio && curW > 0) u.height = Math.round((curH * w) / curW * 100) / 100;
    // Typing a width on auto-width text fixes the width (Figma: → auto height).
    if (isText && (selectedProps.width === "auto" || textMode === "WIDTH_AND_HEIGHT")) {
      u.textAutoResize = "HEIGHT";
    }
    if (isText && u.height !== undefined) u.textAutoResize = "NONE";
    update(u as Partial<ElementProperties>);
  };
  const commitHeight = (h: number) => {
    if (h <= 0) return;
    const u: Record<string, unknown> = { height: h };
    if (lockRatio && curH > 0) u.width = Math.round((curW * h) / curH * 100) / 100;
    if (isText && textMode !== "NONE") u.textAutoResize = "NONE";
    update(u as Partial<ElementProperties>);
  };

  const layoutSection = (
    <Section title="Layout">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <NumberField label="X" value={selectedProps.x} onCommit={(v) => update({ x: v })} onScrubStart={onPropertiesStart} />
        <NumberField label="Y" value={selectedProps.y} onCommit={(v) => update({ y: v })} onScrubStart={onPropertiesStart} />
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
        <NumberField label="W" value={curW} min={1} onCommit={commitWidth} onScrubStart={onPropertiesStart} />
        <NumberField label="H" value={curH} min={1} onCommit={commitHeight} onScrubStart={onPropertiesStart} />
        <button
          type="button"
          aria-label="Constrain proportions"
          aria-pressed={lockRatio}
          title={lockRatio ? "Proportions locked" : "Constrain proportions"}
          onClick={() => setLockRatio((v) => !v)}
          className={`p-1.5 rounded ${lockRatio ? "text-blue-400 bg-blue-600/20" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"}`}
        >
          {lockRatio ? <LinkSimple className="w-4 h-4" /> : <LinkBreak className="w-4 h-4" />}
        </button>
      </div>
    </Section>
  );

  // ── Rotation / Flip Section (shapes, images, paths) ───────────────────
  const canFlip = selectedProps.type === "shape" || selectedProps.type === "image";
  const transformSection =
    selectedProps.type === "shape" || selectedProps.type === "image" || selectedProps.type === "path" ? (
      <Section title="Transform">
        <NumberField
          label="R"
          ariaLabel="Rotation"
          suffix="°"
          value={selectedProps.rotation ?? 0}
          onCommit={(v) => update({ rotation: ((v % 360) + 360) % 360 })}
          onScrubStart={onPropertiesStart}
        />
        {canFlip && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
            <span className="text-[10px] text-zinc-500 font-mono mr-1">Flip</span>
            <button
              type="button"
              onClick={() => update({ flipH: !selectedProps.flipH })}
              aria-pressed={!!selectedProps.flipH}
              className={`p-1.5 rounded text-xs transition-colors ${
                selectedProps.flipH ? "bg-blue-600/20 text-blue-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => update({ flipV: !selectedProps.flipV })}
              aria-pressed={!!selectedProps.flipV}
              className={`p-1.5 rounded text-xs transition-colors ${
                selectedProps.flipV ? "bg-blue-600/20 text-blue-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
              title="Flip Vertical"
            >
              <FlipVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </Section>
    ) : null;

  // ── Layer (opacity %, blend) + Effects — every element type ───────────
  const layerSection = (
    <LayerSection
      opacity={selectedProps.opacity}
      blendMode={selectedProps.blendMode}
      update={(u) => update(u as Partial<ElementProperties>)}
    />
  );
  const effectsSection = (
    <EffectsSection
      effects={selectedProps.effects}
      onChange={(effects) => update({ effects } as Partial<ElementProperties>)}
    />
  );

  const alignment = (
    <AlignmentControls
      ids={allSelectedLayerIds?.filter((id) => allElementProperties?.[id]) ?? []}
      allElementProperties={allElementProperties ?? {}}
      onMoveElement={onMoveElement ?? (() => undefined)}
      onAlignmentStart={onAlignmentStart}
      frameBounds={frameBounds}
    />
  );

  // ── Type-specific sections ────────────────────────────────────────────
  if (selectedProps.type === "text") {
    return provide(
      <>
        {selectionHeader}
        {layoutSection}
        {layerSection}
        <DesignTabText
          selectedProps={selectedProps}
          update={update}
          onPropertiesStart={onPropertiesStart}
          onMoveElement={onMoveElement}
          onAlignmentStart={onAlignmentStart}
          allElementProperties={allElementProperties}
          allSelectedLayerIds={allSelectedLayerIds}
          frameBounds={frameBounds}
        />
        {effectsSection}
      </>,
    );
  }

  if (selectedProps.type === "shape") {
    return provide(
      <>
        {selectionHeader}
        {layoutSection}
        {transformSection}
        {layerSection}
        <DesignTabShape
          key={selectedId}
          selectedProps={selectedProps}
          update={update}
          onPropertiesStart={onPropertiesStart}
          onMoveElement={onMoveElement}
          onAlignmentStart={onAlignmentStart}
          allElementProperties={allElementProperties}
          allSelectedLayerIds={allSelectedLayerIds}
          frameBounds={frameBounds}
        />
        {effectsSection}
      </>,
    );
  }

  if (selectedProps.type === "image") {
    return provide(
      <>
        {selectionHeader}
        {layoutSection}
        {transformSection}
        {layerSection}
        {alignment}
        {effectsSection}
        <Section title="Image">
          <p className="text-xs text-zinc-500 leading-relaxed">Image content is embedded in the exported SVG.</p>
        </Section>
      </>,
    );
  }

  if (selectedProps.type === "path") {
    return provide(
      <>
        {selectionHeader}
        {layoutSection}
        {transformSection}
        {layerSection}
        {alignment}

        <Section title="Stroke">
          <div className="mb-2">
            <ColorField value={selectedProps.stroke} fallback="#3b82f6" onChange={(hex) => update({ stroke: hex })} ariaLabel="Stroke color" />
          </div>
          <NumberField
            label="Wt"
            ariaLabel="Stroke width"
            value={selectedProps.strokeWidth}
            min={0}
            onCommit={(v) => update({ strokeWidth: v })}
          />
          <StrokeStyleControls
            strokeDashArray={selectedProps.strokeDashArray}
            strokeLinecap={selectedProps.strokeLinecap}
            strokeLinejoin={selectedProps.strokeLinejoin}
            defaultCap="round"
            defaultJoin="round"
            update={(u) => update(u as Partial<ElementProperties>)}
          />
        </Section>

        <Section title="Fill">
          <ColorField value={selectedProps.fill} onChange={(hex) => update({ fill: hex })} ariaLabel="Fill color" />
          {!selectedProps.closed && (
            <p className="mt-2 text-[10px] text-zinc-600">Fill applies to closed paths.</p>
          )}
        </Section>
        {effectsSection}
      </>,
    );
  }

  return null;
}

/** Union bounding box of a set of elements. */
function groupBounds(ids: string[], all: Record<string, ElementProperties>) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const b = getElementBoundingBox(all[id]);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** A rect standing in for a group so the alignment helper can treat it as one item. */
function virtualGroupRect(ids: string[], all: Record<string, ElementProperties>): ElementProperties {
  const b = groupBounds(ids, all);
  return {
    type: "shape", kind: "rect", x: b.x, y: b.y, width: b.width, height: b.height,
    fill: "none", stroke: "", strokeWidth: 0, opacity: 1,
  } as ElementProperties;
}

export default DesignTab;
