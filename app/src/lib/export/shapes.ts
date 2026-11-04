import type { ShapeElementProperties, ImageElementProperties, PathElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import { isGradient, gradientUrl } from "../editor/gradient";
import { pointsToSvgD } from "../editor/pathUtils";
import { getLineEndpoints } from "../../components/editor-canvas/shapeHelpers";
import { rectEllipseNodes, svgNodeToString } from "./visualEffects";
import { attr as a, escXml } from "./xml";

export { escXml };

// ─── Helpers ─────────────────────────────────────────────────────────────────


// ─── Shape path helpers ───────────────────────────────────────────────────────

function trianglePath(x: number, y: number, w: number, h: number): string {
  return `M ${x + w / 2} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

function starPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR * 0.4;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M ${points.join(" L ")} Z`;
}

function hexagonPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push(
      `${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`,
    );
  }
  return `M ${points.join(" L ")} Z`;
}

export function renderShapeToSvgString(props: ShapeElementProperties, layerId?: string): string {
  const { kind, x, y, width, height, fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin, strokeDashArray, cornerRadius, opacity, rotation, flipH, flipV } =
    props;
  const fillValue = isGradient(fill) && layerId ? gradientUrl(layerId) : fill;
  const cap = strokeLinecap ?? "butt";
  const join = strokeLinejoin ?? "miter";
  const dashAttr = strokeDashArray ? ` stroke-dasharray="${a(strokeDashArray)}"` : "";
  const capJoinAttr = ` stroke-linecap="${a(cap)}" stroke-linejoin="${a(join)}"${dashAttr}`;
  const strokeAttr = stroke ? ` stroke="${a(stroke)}" stroke-width="${a(strokeWidth)}"${capJoinAttr}` : "";
  const opacityAttr = opacity !== 1 ? ` opacity="${a(opacity)}"` : "";

  let el = "";
  // Rect / ellipse honour independent corner radii + stroke position
  // (cornerRadius default shared via DEFAULT_RECT_CORNER_RADIUS).
  const rectNodes = kind === "rect" || kind === "circle" ? rectEllipseNodes({ ...props, cornerRadius }, fillValue as string) : null;
  if (rectNodes) {
    if (rectNodes.length === 1) {
      const node = rectNodes[0];
      if (opacity !== 1) node.attrs.opacity = opacity;
      el = svgNodeToString(node);
    } else {
      el = `<g${opacityAttr}>${rectNodes.map(svgNodeToString).join("")}</g>`;
    }
  } else if (kind === "triangle") {
    el = `<path d="${a(trianglePath(x, y, width, height))}" fill="${a(fillValue)}"${strokeAttr}${opacityAttr}/>`;
  } else if (kind === "star") {
    el = `<path d="${a(starPath(x, y, width, height))}" fill="${a(fillValue)}"${strokeAttr}${opacityAttr}/>`;
  } else if (kind === "hexagon") {
    el = `<path d="${a(hexagonPath(x, y, width, height))}" fill="${a(fillValue)}"${strokeAttr}${opacityAttr}/>`;
  } else if (kind === "line") {
    const { x1, y1, x2, y2 } = getLineEndpoints(props);
    const lineStroke = stroke || fillValue;
    el = `<line x1="${a(x1)}" y1="${a(y1)}" x2="${a(x2)}" y2="${a(y2)}" stroke="${a(lineStroke)}" stroke-width="${a(Math.max(strokeWidth, 2))}" stroke-linecap="${a(cap)}" stroke-linejoin="${a(join)}"${dashAttr}${opacityAttr}/>`;
  }

  if (!el) return "";

  // Build transform string (rotation + flip centered correctly)
  const cx = x + width / 2;
  const cy = y + height / 2;
  const hasFlip = flipH || flipV;
  const sx = flipH ? -1 : 1;
  const sy = flipV ? -1 : 1;
  let transformStr = "";
  if (hasFlip) {
    transformStr = `translate(${cx}, ${cy}) scale(${sx}, ${sy}) translate(${-cx}, ${-cy})`;
    if (rotation) transformStr = `translate(${cx}, ${cy}) rotate(${rotation}) scale(${sx}, ${sy}) translate(${-cx}, ${-cy})`;
  } else if (rotation) {
    transformStr = `rotate(${rotation}, ${cx}, ${cy})`;
  }

  if (transformStr) {
    return `    <g transform="${a(transformStr)}">\n      ${el}\n    </g>`;
  }
  return `    ${el}`;
}

export function renderImageToSvgString(props: ImageElementProperties): string {
  const { x, y, width, height, url, opacity, rotation, flipH, flipV } = props;
  const opacityAttr = opacity !== 1 ? ` opacity="${a(opacity)}"` : "";
  const el = `<image href="${escXml(url)}" x="${a(x)}" y="${a(y)}" width="${a(width)}" height="${a(height)}"${opacityAttr} preserveAspectRatio="none"/>`;

  const cx = x + width / 2;
  const cy = y + height / 2;
  const hasFlip = flipH || flipV;
  const sx = flipH ? -1 : 1;
  const sy = flipV ? -1 : 1;
  let transformStr = "";
  if (hasFlip) {
    transformStr = `translate(${cx}, ${cy}) scale(${sx}, ${sy}) translate(${-cx}, ${-cy})`;
    if (rotation) transformStr = `translate(${cx}, ${cy}) rotate(${rotation}) scale(${sx}, ${sy}) translate(${-cx}, ${-cy})`;
  } else if (rotation) {
    transformStr = `rotate(${rotation}, ${cx}, ${cy})`;
  }

  if (transformStr) {
    return `    <g transform="${a(transformStr)}">\n      ${el}\n    </g>`;
  }
  return `    ${el}`;
}

export function renderPathToSvgString(props: PathElementProperties): string {
  const { points, stroke, strokeWidth, fill, opacity, closed, rotation, x, y, width, height, subpaths } = props;
  const opacityAttr = opacity !== 1 ? ` opacity="${a(opacity)}"` : "";
  const d = pointsToSvgD(points, closed, props.handles, subpaths);
  const fillAttr = closed ? ` fill="${a(fill)}"` : ` fill="none"`;
  const pathDash = props.strokeDashArray ? ` stroke-dasharray="${a(props.strokeDashArray)}"` : "";
  const el = `<path d="${a(d)}"${fillAttr} stroke="${a(stroke)}" stroke-width="${a(strokeWidth)}" stroke-linecap="${a(props.strokeLinecap ?? "round")}" stroke-linejoin="${a(props.strokeLinejoin ?? "round")}"${pathDash}${opacityAttr}/>`;

  if (rotation) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    return `    <g transform="${a(`rotate(${rotation}, ${cx}, ${cy})`)}">\n      ${el}\n    </g>`;
  }
  return `    ${el}`;
}

export { trianglePath, starPath, hexagonPath };
