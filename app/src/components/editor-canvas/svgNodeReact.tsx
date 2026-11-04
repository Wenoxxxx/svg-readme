import { createElement, type ReactNode } from "react";
import { toReactAttr, type SvgNode } from "../../lib/export/visualEffects";

/** Render a serialisable SvgNode tree (shared with the SVG exporter) as React
 *  elements, so canvas and export draw effects/geometry from one source. */
export function svgNodeToReact(node: SvgNode, key?: string | number): ReactNode {
  const props: Record<string, unknown> = { key };
  for (const [k, v] of Object.entries(node.attrs)) {
    if (k === "style" && typeof v === "string") {
      const style: Record<string, string> = {};
      for (const decl of v.split(";")) {
        const [prop, val] = decl.split(":");
        if (prop && val) style[toReactAttr(prop.trim())] = val.trim();
      }
      props.style = style;
    } else {
      props[toReactAttr(k)] = v;
    }
  }
  return createElement(node.tag, props, ...(node.children ?? []).map((c, i) => svgNodeToReact(c, i)));
}
