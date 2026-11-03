import type {
  LayerEffect,
  BlendMode,
  ShapeElementProperties,
} from "../../components/editor-canvas/elementTypes";
import { hexToRgba, normalizeHex } from "../color";

// ─── Shared defaults ─────────────────────────────────────────────────────────

/** Rect corner radius used when `cornerRadius` is unset — panel, canvas and
 *  export all read this so they never disagree. */
export const DEFAULT_RECT_CORNER_RADIUS = 4;

export const BLEND_MODES: BlendMode[] = [
  "normal", "multiply", "screen", "overlay", "darken", "lighten",
  "color-dodge", "color-burn", "hard-light", "soft-light", "difference",
  "exclusion", "hue", "saturation", "color", "luminosity",
];

// ─── Generic SVG node description (serialisable to string or React) ─────────

export interface SvgNode {
  tag: string;
  attrs: Record<string, string | number>;
  children?: SvgNode[];
}

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/** Serialise an SvgNode tree to an SVG/XML string. */
export function svgNodeToString(node: SvgNode): string {
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${typeof v === "number" ? fmt(v) : String(v).replace(/"/g, "&quot;")}"`)
    .join("");
  if (!node.children || node.children.length === 0) return `<${node.tag}${attrs}/>`;
  return `<${node.tag}${attrs}>${node.children.map(svgNodeToString).join("")}</${node.tag}>`;
}

/** Hyphenated SVG attribute → React prop name. */
export function toReactAttr(name: string): string {
  if (name === "class") return "className";
  if (name === "xlink:href") return "href";
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

// ─── Colors ──────────────────────────────────────────────────────────────────

/** Split "#rrggbb[aa]" into an opaque color + 0–1 opacity. */
export function splitColorAlpha(color: string): { color: string; opacity: number } {
  const n = normalizeHex(color);
  if (!n) return { color, opacity: 1 };
  const { a } = hexToRgba(n);
  return { color: n.slice(0, 7), opacity: Math.round(a) / 100 };
}

// ─── Effects → <filter> ──────────────────────────────────────────────────────

/** Unique filter id per layer. */
export function effectsFilterId(layerId: string): string {
  return `fx-${layerId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function hasVisibleEffects(effects: LayerEffect[] | undefined): boolean {
  return !!effects && effects.some((e) => e.visible);
}

/**
 * Build the <filter> node for a layer's effect stack, or null when no effect
 * is visible. Drop shadows render beneath the source graphic, inner shadows on
 * top of it (clipped to the source alpha) and layer blur blurs the result.
 * Uses only standard filter primitives, which GitHub's <img> SVG rendering
 * supports.
 */
export function buildEffectsFilter(layerId: string, effects: LayerEffect[] | undefined): SvgNode | null {
  if (!hasVisibleEffects(effects)) return null;
  const visible = effects!.filter((e) => e.visible);
  const prims: SvgNode[] = [];
  const below: string[] = [];
  const above: string[] = [];
  let blur = 0;

  visible.forEach((fx, i) => {
    if (fx.type === "layer-blur") {
      blur = Math.max(blur, fx.blur);
      return;
    }
    const { color, opacity } = splitColorAlpha(fx.color);
    const std = Math.max(0, fx.blur) / 2;
    const spread = fx.spread ?? 0;
    if (fx.type === "drop-shadow") {
      let src = "SourceAlpha";
      if (spread !== 0) {
        prims.push({ tag: "feMorphology", attrs: { in: src, operator: spread > 0 ? "dilate" : "erode", radius: Math.abs(spread), result: `ds-m${i}` } });
        src = `ds-m${i}`;
      }
      prims.push({ tag: "feGaussianBlur", attrs: { in: src, stdDeviation: std, result: `ds-b${i}` } });
      prims.push({ tag: "feOffset", attrs: { in: `ds-b${i}`, dx: fx.x, dy: fx.y, result: `ds-o${i}` } });
      prims.push({ tag: "feFlood", attrs: { "flood-color": color, "flood-opacity": opacity, result: `ds-c${i}` } });
      prims.push({ tag: "feComposite", attrs: { in: `ds-c${i}`, in2: `ds-o${i}`, operator: "in", result: `ds${i}` } });
      below.push(`ds${i}`);
    } else {
      // Inner shadow: invert the alpha, blur + offset it, keep only the part
      // that falls inside the source shape.
      prims.push({
        tag: "feComponentTransfer",
        attrs: { in: "SourceAlpha", result: `is-inv${i}` },
        children: [{ tag: "feFuncA", attrs: { type: "table", tableValues: "1 0" } }],
      });
      let src = `is-inv${i}`;
      if (spread !== 0) {
        prims.push({ tag: "feMorphology", attrs: { in: src, operator: spread > 0 ? "dilate" : "erode", radius: Math.abs(spread), result: `is-m${i}` } });
        src = `is-m${i}`;
      }
      prims.push({ tag: "feGaussianBlur", attrs: { in: src, stdDeviation: std, result: `is-b${i}` } });
      prims.push({ tag: "feOffset", attrs: { in: `is-b${i}`, dx: fx.x, dy: fx.y, result: `is-o${i}` } });
      prims.push({ tag: "feFlood", attrs: { "flood-color": color, "flood-opacity": opacity, result: `is-c${i}` } });
      prims.push({ tag: "feComposite", attrs: { in: `is-c${i}`, in2: `is-o${i}`, operator: "in", result: `is-s${i}` } });
      prims.push({ tag: "feComposite", attrs: { in: `is-s${i}`, in2: "SourceAlpha", operator: "in", result: `is${i}` } });
      above.push(`is${i}`);
    }
  });

  const mergeInputs = [...below, "SourceGraphic", ...above];
  prims.push({
    tag: "feMerge",
    attrs: { result: "fx-merged" },
    children: mergeInputs.map((r) => ({ tag: "feMergeNode", attrs: { in: r } })),
  });
  if (blur > 0) {
    prims.push({ tag: "feGaussianBlur", attrs: { in: "fx-merged", stdDeviation: blur / 2 } });
  }

  return {
    tag: "filter",
    attrs: {
      id: effectsFilterId(layerId),
      x: "-50%",
      y: "-50%",
      width: "200%",
      height: "200%",
      "color-interpolation-filters": "sRGB",
    },
    children: prims,
  };
}

/** Attributes for the wrapper <g> that applies effects / blend / opacity. */
export function effectWrapperAttrs(
  layerId: string,
  props: { effects?: LayerEffect[]; blendMode?: BlendMode },
  opacity?: number,
): Record<string, string | number> | null {
  const attrs: Record<string, string | number> = {};
  if (hasVisibleEffects(props.effects)) attrs.filter = `url(#${effectsFilterId(layerId)})`;
  if (props.blendMode && props.blendMode !== "normal") attrs.style = `mix-blend-mode:${props.blendMode}`;
  if (opacity !== undefined && opacity !== 1) attrs.opacity = opacity;
  return Object.keys(attrs).length > 0 ? attrs : null;
}

// ─── Rect corner radii ───────────────────────────────────────────────────────

export type CornerRadii = [number, number, number, number];

/** Resolve the effective [tl, tr, br, bl] radii for a rect. */
export function resolveCornerRadii(props: Pick<ShapeElementProperties, "cornerRadius" | "cornerRadii">): CornerRadii {
  if (props.cornerRadii && props.cornerRadii.length === 4) return [...props.cornerRadii] as CornerRadii;
  const r = props.cornerRadius ?? DEFAULT_RECT_CORNER_RADIUS;
  return [r, r, r, r];
}

export function radiiAreUniform(r: CornerRadii): boolean {
  return r[0] === r[1] && r[1] === r[2] && r[2] === r[3];
}

/** Path for a rect with independent corner radii (clamped to fit, CSS-style). */
export function roundedRectPath(x: number, y: number, w: number, h: number, radii: CornerRadii): string {
  let [tl, tr, br, bl] = radii.map((r) => Math.max(0, r));
  const f = Math.min(
    1,
    w / Math.max(tl + tr, 1e-9),
    w / Math.max(bl + br, 1e-9),
    h / Math.max(tl + bl, 1e-9),
    h / Math.max(tr + br, 1e-9),
  );
  if (f < 1) {
    tl *= f; tr *= f; br *= f; bl *= f;
  }
  const p = [
    `M ${fmt(x + tl)} ${fmt(y)}`,
    `H ${fmt(x + w - tr)}`,
    tr ? `A ${fmt(tr)} ${fmt(tr)} 0 0 1 ${fmt(x + w)} ${fmt(y + tr)}` : "",
    `V ${fmt(y + h - br)}`,
    br ? `A ${fmt(br)} ${fmt(br)} 0 0 1 ${fmt(x + w - br)} ${fmt(y + h)}` : "",
    `H ${fmt(x + bl)}`,
    bl ? `A ${fmt(bl)} ${fmt(bl)} 0 0 1 ${fmt(x)} ${fmt(y + h - bl)}` : "",
    `V ${fmt(y + tl)}`,
    tl ? `A ${fmt(tl)} ${fmt(tl)} 0 0 1 ${fmt(x + tl)} ${fmt(y)}` : "",
    "Z",
  ];
  return p.filter(Boolean).join(" ");
}

/** Outline geometry node (rect / path / ellipse) for a box, without paint. */
function outlineNode(kind: "rect" | "circle", x: number, y: number, w: number, h: number, radii: CornerRadii): SvgNode {
  if (kind === "circle") {
    return { tag: "ellipse", attrs: { cx: x + w / 2, cy: y + h / 2, rx: Math.max(0, w / 2), ry: Math.max(0, h / 2) } };
  }
  if (radiiAreUniform(radii)) {
    return { tag: "rect", attrs: { x, y, width: Math.max(0, w), height: Math.max(0, h), rx: radii[0] } };
  }
  return { tag: "path", attrs: { d: roundedRectPath(x, y, Math.max(0, w), Math.max(0, h), radii) } };
}

/** Clip/mask geometry for a rect/circle shape (respects independent radii). */
export function shapeOutlineNode(props: ShapeElementProperties): SvgNode | null {
  if (props.kind !== "rect" && props.kind !== "circle") return null;
  return outlineNode(props.kind, props.x, props.y, props.width, props.height, resolveCornerRadii(props));
}

/**
 * Draw nodes for a rect/circle honouring independent corner radii and stroke
 * position. Inside/outside strokes are drawn as a separate stroke-only
 * outline inset/outset by half the stroke width (geometric offset).
 * Returns null for other shape kinds. `fill` is the resolved paint
 * (e.g. a gradient url()).
 */
export function rectEllipseNodes(props: ShapeElementProperties, fill: string): SvgNode[] | null {
  if (props.kind !== "rect" && props.kind !== "circle") return null;
  const { x, y, width: w, height: h, stroke, strokeWidth } = props;
  const radii = resolveCornerRadii(props);
  const position = props.strokePosition ?? "center";
  const strokeAttrs: Record<string, string | number> = {};
  if (stroke) {
    strokeAttrs.stroke = stroke;
    strokeAttrs["stroke-width"] = strokeWidth;
    strokeAttrs["stroke-linecap"] = props.strokeLinecap ?? "butt";
    strokeAttrs["stroke-linejoin"] = props.strokeLinejoin ?? "miter";
    if (props.strokeDashArray) strokeAttrs["stroke-dasharray"] = props.strokeDashArray;
  }

  if (position === "center" || !stroke || !strokeWidth) {
    const node = outlineNode(props.kind, x, y, w, h, radii);
    node.attrs = { ...node.attrs, fill, ...strokeAttrs };
    return [node];
  }

  const d = (position === "inside" ? -1 : 1) * (strokeWidth / 2);
  const fillNode = outlineNode(props.kind, x, y, w, h, radii);
  fillNode.attrs = { ...fillNode.attrs, fill };
  const strokeRadii = radii.map((r) => (r > 0 ? Math.max(0, r + d) : 0)) as CornerRadii;
  const strokeNode = outlineNode(props.kind, x - d, y - d, w + 2 * d, h + 2 * d, strokeRadii);
  strokeNode.attrs = { ...strokeNode.attrs, fill: "none", ...strokeAttrs };
  return [fillNode, strokeNode];
}
