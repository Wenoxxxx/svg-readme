import type { ElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import { resolveLayerAnimation } from "../../components/editor-canvas/animationPresets";
import { buildEffectsFilter, effectWrapperAttrs, shapeOutlineNode, svgNodeToString } from "./visualEffects";
import { isGradient, gradientId, buildGradientDef } from "../editor/gradient";
import { TEXT_ANCHOR_MAP, getTextVerticalOffset, getTextXWithinBox } from "../editor/textAlign";
import { getTextLines, getLineHeight, getTextBlockHeight, getTextBlockWidth } from "../editor/textMeasure";
import type { LayerType } from "../../context/EditorContext";
import { escXml, renderShapeToSvgString, renderImageToSvgString, renderPathToSvgString, trianglePath, starPath, hexagonPath } from "./shapes";
import { pointsToSvgD } from "../editor/pathUtils";
import { attr as a, safeToken, sanitizeStyleText, sanitizeCssValue } from "./xml";

// ─── Build SVG string ────────────────────────────────────────────────────────

export interface BuildSvgOptions {
  frameSize: { width: number; height: number };
  elementProperties: Record<string, ElementProperties>;
  layers: LayerType[];
  /** Background color for the canvas (default: #09090b) */
  backgroundColor?: string;
  /** Whether to include rounded corners (default: true) */
  rounded?: boolean;
  /** Border radius in px (default: 12) */
  borderRadius?: number;
  /** Show border (default: true) */
  showBorder?: boolean;
}

export function buildSvgString(options: BuildSvgOptions): string {
  const {
    frameSize,
    elementProperties,
    layers,
    backgroundColor = "#09090b",
    rounded = true,
    borderRadius = 12,
    showBorder = true,
  } = options;

  const { width: w, height: h } = frameSize;

  // Build a lookup: parentId → children (sorted by layers order)
  const childrenMap = new Map<string | null, string[]>();
  for (const layer of layers) {
    const parentKey = layer.parentId ?? null;
    if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
    childrenMap.get(parentKey)!.push(layer.id);
  }

  // Also build a quick lookup by id
  const layerById = new Map(layers.map((l) => [l.id, l]));

  // Mask <clipPath> defs collected while rendering groups with a masked child.
  const maskDefs: string[] = [];
  // Effect <filter> defs (one per layer with visible effects; unique ids).
  const filterDefs: string[] = [];
  const filterEmitted = new Set<string>();
  const hasFilterFor = (id: string) => {
    if (filterEmitted.has(id)) return false;
    filterEmitted.add(id);
    return true;
  };

  /** Clip geometry string for a masked layer. */
  function maskClipShape(id: string): string {
    const props = elementProperties[id];
    if (!props) return "";
    if (props.type === "shape") {
      const { kind, x, y, width, height } = props;
      const outline = shapeOutlineNode(props);
      if (outline) return svgNodeToString(outline);
      if (kind === "triangle") return `<path d="${a(trianglePath(x, y, width, height))}"/>`;
      if (kind === "star") return `<path d="${a(starPath(x, y, width, height))}"/>`;
      if (kind === "hexagon") return `<path d="${a(hexagonPath(x, y, width, height))}"/>`;
      return ""; // lines have no area
    }
    if (props.type === "path") {
      return `<path d="${a(pointsToSvgD(props.points, props.closed, props.handles, props.subpaths))}"/>`;
    }
    if (props.type === "text") {
      return `<text x="${a(props.x)}" y="${a(Number(props.y) + Number(props.fontSize))}" font-family="${a(props.fontFamily)}" font-size="${a(props.fontSize)}" font-weight="${a(props.fontWeight)}">${escXml(String(props.content))}</text>`;
    }
    return ""; // image masks unsupported
  }

  /** Render a specific list of layer ids (used to split mask children). */
  function renderLayerList(ids: string[], indent: number): string[] {
    const result: string[] = [];
    const pad = "    ".repeat(indent);

    for (const id of ids) {
      const layer = layerById.get(id);
      if (!layer || !layer.visible) continue;

      if (layer.type === "group") {
        const kids = (childrenMap.get(id) ?? []).filter((kidId) => {
          const kl = layerById.get(kidId);
          return kl && kl.visible;
        });
        const maskKidId = kids.find((kidId) => layerById.get(kidId)?.masked);
        const rest = maskKidId ? kids.filter((k) => k !== maskKidId) : kids;
        if (maskKidId) {
          maskDefs.push(
            `${pad}<clipPath id="mask-${safeToken(id)}">${maskClipShape(maskKidId)}</clipPath>`,
          );
        }
        const content: string[] = [];
        if (maskKidId) {
          if (rest.length > 0) {
            content.push(`${pad}  <g clip-path="url(#mask-${safeToken(id)})">`);
            content.push(...renderLayerList(rest, indent + 2));
            content.push(`${pad}  </g>`);
          }
          // The mask layer itself renders normally (Figma shows its fill).
          content.push(...renderLayerList([maskKidId], indent + 1));
        } else {
          content.push(...renderLayerList(kids, indent + 1));
        }
        if (content.length > 0) {
          result.push(`${pad}<g id="${a(id)}">`);
          result.push(...content);
          result.push(`${pad}</g>`);
        }
        continue;
      }

      const props = elementProperties[id];
      if (!props) continue;

      const anim = props.animation;

      // Wrapping order (outer → inner): animation <g> (never carries a
      // positioning transform, so CSS transform keyframes cannot clobber it)
      // → effects/blend/opacity <g> → element (which may carry its own
      // translate/rotate transform).
      const wrap = (body: string[], opacity?: number): string[] => {
        const fxAttrs = effectWrapperAttrs(id, props, opacity);
        if (hasFilterFor(id)) {
          const node = buildEffectsFilter(id, props.effects);
          if (node) filterDefs.push(`    ${svgNodeToString(node)}`);
        }
        let out = body;
        if (fxAttrs) {
          const attrStr = Object.entries(fxAttrs).map(([k, v]) => ` ${k}="${a(v)}"`).join("");
          out = [`${pad}<g${attrStr}>`, ...out, `${pad}</g>`];
        }
        if (anim) out = [`${pad}<g class="anim-${safeToken(id)}">`, ...out, `${pad}</g>`];
        return out;
      };

      if (props.type === "shape") {
        result.push(...wrap([renderShapeToSvgString(props, id)]));
      } else if (props.type === "image") {
        result.push(...wrap([renderImageToSvgString(props)]));
      } else if (props.type === "path") {
        result.push(...wrap([renderPathToSvgString(props)]));
      } else if (props.type === "text") {
        if (!props.content.trim()) continue;
        const textOut: string[] = [];

        const anchor = TEXT_ANCHOR_MAP[props.textAlign] ?? "start";
        const fill = props.color;
        const family = props.fontFamily;
        const size = props.fontSize;
        const weight = props.fontWeight;
        const italicAttr = props.italic ? ` font-style="italic"` : "";
        const fillA = a(fill);
        const spacingAttr = props.letterSpacing ? ` letter-spacing="${a(props.letterSpacing)}"` : "";

        // Box dimensions measured through textMeasure so the exported box agrees
        // with the rendered text (A11).
        const isAutoWidth = props.width === "auto";
        const fixedWidth = typeof props.width === "number" ? props.width : 0;
        const resize = props.textAutoResize ?? "WIDTH_AND_HEIGHT";
        const wrapWidth =
          isAutoWidth || resize === "WIDTH_AND_HEIGHT" ? 0 : fixedWidth;
        const lines = getTextLines(props.content, props, wrapWidth);
        const boxWidth: number = isAutoWidth
          ? Math.max(getTextBlockWidth(lines), 20)
          : fixedWidth;
        const boxHeight = props.height;
        const lineHeight = getLineHeight(props);
        const blockHeight = getTextBlockHeight(lines, props);
        const blockOffsetY = getTextVerticalOffset(boxHeight, blockHeight, props.textAlignVertical);

        const lineX =
          isAutoWidth || resize === "WIDTH_AND_HEIGHT"
            ? 0
            : getTextXWithinBox(props, boxWidth);
        const lineAnchor =
          isAutoWidth || resize === "WIDTH_AND_HEIGHT" ? "start" : anchor;

        textOut.push(`${pad}<g transform="${a(`translate(${props.x}, ${props.y})`)}">`);

        if (props.backgroundColor) {
          textOut.push(
            `${pad}  <rect x="0" y="0" width="${a(boxWidth)}" height="${a(boxHeight)}" fill="${a(props.backgroundColor)}" rx="3"/>`,
          );
        }

        lines.forEach((line, i) => {
          const lineY = blockOffsetY + size + i * lineHeight;
          const decoration = props.textDecoration ?? "NONE";
          const decorationY =
            decoration === "UNDERLINE"
              ? lineY + 2
              : lineY - size * 0.4;
          textOut.push(
            `${pad}  <text x="${a(lineX)}" y="${a(lineY)}" font-family="${a(family)}" font-size="${a(size)}" font-weight="${a(weight)}"${italicAttr}${spacingAttr} fill="${fillA}" text-anchor="${a(lineAnchor)}">${escXml(String(line.text))}</text>`,
          );
          if (decoration !== "NONE" && line.text.length > 0) {
            const x1 =
              lineAnchor === "end"
                ? boxWidth - line.width
                : lineX;
            const x2 =
              lineAnchor === "end"
                ? boxWidth
                : lineAnchor === "middle"
                  ? lineX + line.width / 2
                  : lineX + line.width;
            textOut.push(
              `${pad}  <line x1="${a(x1)}" y1="${a(decorationY)}" x2="${a(x2)}" y2="${a(decorationY)}" stroke="${fillA}" stroke-width="${a(Math.max(1, size * 0.06))}"/>`,
            );
          }
        });

        textOut.push(`${pad}</g>`);
        result.push(...wrap(textOut, props.opacity));
      }
    }
    return result;
  }

  /** Recursively render a group of layers at a given parent level. */
  function renderChildren(parentId: string | null, indent: number): string[] {
    return renderLayerList(childrenMap.get(parentId) ?? [], indent);
  }

  const elementStrings = renderChildren(null, 2);

  // Collect gradient defs for layers using gradient fills.
  // Only shapes can carry a gradient fill (matches ElementsRenderer); isGradient
  // narrows the string-typed fill to GradientFill.
  const gradientDefs: string[] = [];
  for (const [id, props] of Object.entries(elementProperties)) {
    if (props.type === "shape" && isGradient(props.fill)) {
      gradientDefs.push(buildGradientDef(gradientId(id), props.fill));
    }
  }

  // Collect animation @keyframes CSS for all animated layers
  const animationKeyframesCSS: string[] = [];
  const animationRulesCSS: string[] = [];
  const seenAnimNames = new Set<string>();
  for (const layer of layers) {
    if (!layer.visible) continue;
    const props = elementProperties[layer.id];
    const anim = props?.animation;
    if (!anim) continue;
    // Preset keyframes are shared (deduped by name); custom keyframes and
    // timeline-marker retiming get a per-layer @keyframes name so layers
    // never clobber each other, and the rule references that exact name.
    const resolved = resolveLayerAnimation(layer.id, anim);
    if (resolved.keyframesCSS && !seenAnimNames.has(resolved.name)) {
      seenAnimNames.add(resolved.name);
      // Custom keyframes are user/document data: never let them close <style>.
      animationKeyframesCSS.push(sanitizeStyleText(resolved.keyframesCSS));
    }
    // transform-box/origin: scale/rotate presets pivot on the element centre.
    animationRulesCSS.push(
      `  .anim-${safeToken(layer.id)} { animation: ${sanitizeCssValue(resolved.css)}; transform-box: fill-box; transform-origin: center; }`,
    );
  }

  // Accessibility: honor the user's reduced-motion preference. When the media
  // query matches, all animated layers render statically (A15).
  const reducedMotionCSS =
    animationRulesCSS.length > 0
      ? `\n  @media (prefers-reduced-motion: reduce) {\n    [class*="anim-"] { animation: none !important; }\n  }`
      : "";

  const rx = rounded ? ` rx="${a(borderRadius)}"` : "";
  const borderStroke = showBorder
    ? ` stroke="rgba(255,255,255,0.10)" stroke-width="1"`
    : "";

  // Build combined <style> block
  const styleBlock = [
    `      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');`,
    ...animationKeyframesCSS.map((kf) => kf.split("\n").map((l) => `      ${l}`).join("\n")),
    ...animationRulesCSS.map((r) => `      ${r}`),
    reducedMotionCSS,
  ]
    .filter((part) => part.length > 0)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${a(w)}" height="${a(h)}" viewBox="0 0 ${a(w)} ${a(h)}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <style><![CDATA[
${styleBlock}
    ]]></style>
${gradientDefs.join("\n")}
${maskDefs.join("\n")}
${filterDefs.join("\n")}
  </defs>
  <rect x="0" y="0" width="${a(w)}" height="${a(h)}" fill="${a(backgroundColor)}"${rx}${borderStroke}/>
${elementStrings.join("\n")}
</svg>`;
}
