import type { PathVertexHandle } from "../../lib/editor/pathUtils";
import type { AnimationConfig } from "./animationPresets";

// ─── Shared visual props (Figma-style) ────────────────────────────────────────

/** Layer effect kinds — rendered as SVG <filter> primitives on canvas and in export. */
export type EffectType = "drop-shadow" | "inner-shadow" | "layer-blur";

export interface LayerEffect {
  /** Stable id (list key + edit target). */
  id: string;
  type: EffectType;
  visible: boolean;
  /** Shadow offset (ignored by layer-blur). */
  x: number;
  y: number;
  /** Blur radius in px (Figma semantics: ≈ 2 × stdDeviation). */
  blur: number;
  /** Shadow spread in px (dilate/erode of the alpha). */
  spread?: number;
  /** Shadow color, #rrggbb or #rrggbbaa (alpha honoured). */
  color: string;
}

export type BlendMode =
  | "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"
  | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference"
  | "exclusion" | "hue" | "saturation" | "color" | "luminosity";

export type StrokePosition = "center" | "inside" | "outside";

/** Optional Figma-style appearance props shared by every element type. */
export interface VisualEffectProps {
  /** Effects stack (drop shadow, inner shadow, layer blur). */
  effects?: LayerEffect[];
  /** CSS mix-blend-mode. Undefined / "normal" = no blending. */
  blendMode?: BlendMode;
}

// ─── Element Property Types ───────────────────────────────────────────────────

export interface TextElementProperties extends VisualEffectProps {
  type: "text";
  x: number;
  y: number;
  width: number | "auto";
  height: number;
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  /** Text foreground color (hex). Maps to SVG <text fill="...">. */
  color: string;
  /** Text box background fill (hex). When set, renders a filled rect behind the text.
   *  Undefined or empty string means no background. Open-pencil equivalent: fills on a rect. */
  backgroundColor?: string;
  /** Horizontal alignment — matches open-pencil's textAlignHorizontal (JUSTIFIED renders start-anchored for single-line text). */
  textAlign: "left" | "center" | "right" | "justify";
  /** Vertical alignment inside the text box — matches open-pencil's textAlignVertical. */
  textAlignVertical: "top" | "center" | "bottom";
  /** Text box resizing behavior — matches open-pencil's textAutoResize.
   *  WIDTH_AND_HEIGHT: box hugs content (auto width). HEIGHT: width fixed, height hugs lines.
   *  NONE: fixed box (resize via handles). */
  textAutoResize?: "NONE" | "HEIGHT" | "WIDTH_AND_HEIGHT";
  /** Line height in px. Defaults to fontSize * 1.4 when unset. */
  lineHeight?: number;
  /** Letter spacing in px (open-pencil uses %, but px maps cleanly to SVG). */
  letterSpacing?: number;
  /** Italic text (font-style). */
  italic?: boolean;
  /** Text decoration — matches open-pencil's textDecoration. */
  textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
  /** Text case transform — matches open-pencil's textCase. */
  textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE";
  /** Flip horizontally (mirror across Y axis). The renderer wraps the text box. */
  flipH?: boolean;
  /** Flip vertically (mirror across X axis). */
  flipV?: boolean;
  /** Layer opacity 0–1 (undefined = 1). */
  opacity?: number;
  /** CSS animation applied to this text element. Embedded as @keyframes in exported SVG. */
  animation?: AnimationConfig;
}

export type ShapeKind = "rect" | "circle" | "triangle" | "star" | "hexagon" | "line";

export interface ShapeElementProperties extends VisualEffectProps {
  type: "shape";
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
  /** Stroke dash array (e.g. "6 3" = 6px dash, 3px gap). Open Pencil-style dash pattern. */
  strokeDashArray?: string;
  /** Line shapes only: how the line runs through its box. Undefined (legacy
   *  documents) = horizontal through the vertical middle; "down" = top-left →
   *  bottom-right; "up" = bottom-left → top-right. See getLineEndpoints. */
  lineDirection?: "horizontal" | "down" | "up";
  /** Corner radius for rect shapes. Defaults to 4 when unset. 0 = sharp corners. */
  cornerRadius?: number;
  /** Independent corner radii [top-left, top-right, bottom-right, bottom-left].
   *  When set it overrides cornerRadius (rect only). */
  cornerRadii?: [number, number, number, number];
  /** Stroke alignment relative to the outline (rect / circle). Defaults to center. */
  strokePosition?: StrokePosition;
  opacity: number;
  /** Rotation in degrees around the shape's own center (0–360). */
  rotation?: number;
  /** Flip horizontally (mirror across Y axis). */
  flipH?: boolean;
  /** Flip vertically (mirror across X axis). */
  flipV?: boolean;
  /** CSS animation applied to this shape. Embedded as @keyframes in exported SVG. */
  animation?: AnimationConfig;
}

export interface ImageElementProperties extends VisualEffectProps {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  /** Base64 data URL or external URL */
  url: string;
  opacity: number;
  /** Rotation in degrees around the image's own center (0–360). */
  rotation?: number;
  /** Flip horizontally (mirror across Y axis). */
  flipH?: boolean;
  /** Flip vertically (mirror across X axis). */
  flipV?: boolean;
  /** CSS animation applied to this image. Embedded as @keyframes in exported SVG. */
  animation?: AnimationConfig;
}

export interface PathElementProperties extends VisualEffectProps {
  type: "path";
  /** Bounding-box x (min x of all points) */
  x: number;
  /** Bounding-box y (min y of all points) */
  y: number;
  /** Bounding-box width (max x - min x) */
  width: number;
  /** Bounding-box height (max y - min y) */
  height: number;
  /** Absolute canvas-space points [[x,y], [x,y], ...] */
  points: [number, number][];
  /** Optional per-vertex bezier handles (parallel to `points`). Absent → all-straight.
   *  A segment i→i+1 is a cubic curve when either endpoint carries a handle. */
  handles?: (PathVertexHandle | undefined)[];
  /** Additional closed loops (holes / extra components) produced by boolean ops.
   *  Rendered as extra subpaths of the same path element; winding is consistent
   *  with the nonzero fill rule (holes are opposite to the outer loop). */
  subpaths?: [number, number][][];
  stroke: string;
  strokeWidth: number;
  /** Stroke cap (default round). */
  strokeLinecap?: "butt" | "round" | "square";
  /** Stroke join (default round). */
  strokeLinejoin?: "miter" | "round" | "bevel";
  /** Stroke dash array, e.g. "6 3". */
  strokeDashArray?: string;
  fill: string;
  opacity: number;
  /** Whether the path should be closed (connect last point back to first). */
  closed: boolean;
  /** Rotation in degrees around the path's center (0–360). */
  rotation?: number;
  /** Flip horizontally (mirror across Y axis). */
  flipH?: boolean;
  /** Flip vertically (mirror across X axis). */
  flipV?: boolean;
  /** CSS animation applied to this path. Embedded as @keyframes in exported SVG. */
  animation?: AnimationConfig;
}

/** Union of all element property types */
export type ElementProperties = TextElementProperties | ShapeElementProperties | ImageElementProperties | PathElementProperties;
