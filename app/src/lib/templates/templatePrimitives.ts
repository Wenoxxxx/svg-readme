import type { LayerType } from "../../context/EditorContext";
import type {
  ElementProperties,
  ShapeElementProperties,
  TextElementProperties,
} from "../../components/editor-canvas/ElementsRenderer";
import type { GradientFill } from "../editor/gradient";
import { DEFAULT_TEXT_PROPS } from "../../components/editor-canvas/types";
import { hexToHsl, hexToRgba, hslToHex, rgbToHex } from "../color";

// ─── Shared template primitives ─────────────────────────────────────────────
// Small builders shared by background templates + animated component kits so
// both produce identical LayerType / ElementProperties shapes.

export interface TemplateBuild {
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
}

export function shapeLayer(id: string, name: string, parentId: string | null): LayerType {
  return {
    id,
    name,
    type: "shape",
    locked: false,
    visible: true,
    active: false,
    parentId,
  };
}

export function textLayer(id: string, name: string, parentId: string | null): LayerType {
  return {
    id,
    name,
    type: "text",
    locked: false,
    visible: true,
    active: false,
    parentId,
  };
}

export function groupLayer(id: string, name: string, locked = false): LayerType {
  return {
    id,
    name,
    type: "group",
    locked,
    visible: true,
    active: false,
    parentId: null,
  };
}

export function shapeProps(
  props: Omit<ShapeElementProperties, "type" | "fill"> & { fill: string | GradientFill },
): ShapeElementProperties {
  // Runtime supports GradientFill via isGradient() even though the declared
  // type is string (matches ElementsRenderer + export/shapes handling).
  return { type: "shape", ...props, fill: props.fill as unknown as string };
}

export function textProps(props: Omit<TextElementProperties, "type">): TextElementProperties {
  return { ...DEFAULT_TEXT_PROPS, ...props, type: "text" };
}

/** Full-frame base panel — first child of bg groups, recolorable via Design tab. */
export function basePanel(
  groupId: string,
  w: number,
  h: number,
  fill: string | GradientFill = "#ffffff",
): { layer: LayerType; props: ShapeElementProperties } {
  const id = `${groupId}-base-panel`;
  return {
    layer: shapeLayer(id, "Background Base", groupId),
    props: shapeProps({
      kind: "rect",
      x: 0,
      y: 0,
      width: w,
      height: h,
      fill,
      stroke: "rgba(255,255,255,0)",
      strokeWidth: 0,
      cornerRadius: 0,
      opacity: 1,
    }),
  };
}

/** Unique id prefix per insert so repeated inserts never collide. */
export function templateInstanceId(slug: string): string {
  return `${slug}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

// ─── Template option helpers ─────────────────────────────────────────────────
// Background templates accept { primary, accent, speed } at build time so the
// ribbon can customize them. All helpers fall back to current hardcoded looks.

/** Shift a hex color to an absolute lightness (0–100), keeping hue/sat. */
export function shade(hex: string, lightness: number): string {
  const { h, s } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, lightness)));
}

/** Attach an alpha (0–1) to a hex color, returning #rrggbbaa. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgba(hex);
  return rgbToHex(r, g, b, Math.round(Math.max(0, Math.min(1, alpha)) * 100));
}

/** Scale a base duration by a speed multiplier (guarded, 2dp). */
export function pace(duration: number, speed = 1): number {
  const s = speed > 0 ? speed : 1;
  return Math.round((duration / s) * 100) / 100;
}
