import { parseQuickSize } from "./quickBanner";
import type { QuickBannerOptions } from "./quickBanner";
import type { LayerType } from "../../../context/EditorContext";
import type { ElementProperties } from "../../../components/editor-canvas/ElementsRenderer";

const HANDOFF_KEY = "svg-readme:quick-handoff";

export type QuickHandoffPayload = QuickBannerOptions;

export function saveQuickHandoff(payload: QuickHandoffPayload): void {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable — editor will just boot normally */
  }
}

export function consumeQuickHandoff(): QuickHandoffPayload | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    const data = JSON.parse(raw) as Partial<QuickHandoffPayload>;
    if (typeof data !== "object" || data === null) return null;
    return {
      handle: typeof data.handle === "string" ? data.handle : "",
      tagline: typeof data.tagline === "string" ? data.tagline : "",
      color: typeof data.color === "string" ? data.color : "#1b5def",
      motion: data.motion === "sweep" || data.motion === "rise" || data.motion === "type" ? data.motion : "fade",
      size: typeof data.size === "string" ? data.size : "800x200",
      theme: data.theme === "dark" ? "dark" : "light",
      font: data.font === "sans" || data.font === "display" ? data.font : "mono",
      gradient: data.gradient === true,
    };
  } catch {
    return null;
  }
}

const FONT_FAMILY: Record<string, string> = {
  mono: "JetBrains Mono",
  sans: "Inter",
  display: "Poppins",
};

export function buildHandoffDocument(payload: QuickHandoffPayload): {
  frameSize: { width: number; height: number };
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
  name: string;
} {
  const { w, h } = parseQuickSize(payload.size);
  const dark = payload.theme === "dark";
  const ink = dark ? "#fafafa" : "#18181b";
  const inkSoft = dark ? "#a1a1aa" : "#52525b";
  const fontFamily = FONT_FAMILY[payload.font ?? "mono"] ?? FONT_FAMILY.mono;
  const baseX = Math.round(w * 0.065);
  const handle = payload.handle.trim() || "Your Name";
  const tagline = payload.tagline.trim();

  const layers: LayerType[] = [
    { id: "quick-accent", name: "Accent", type: "shape", locked: false, visible: true, active: false, parentId: null },
    { id: "quick-handle", name: "Handle", type: "text", locked: false, visible: true, active: false, parentId: null },
  ];
  const elementProperties: Record<string, ElementProperties> = {
    "quick-accent": {
      type: "shape", kind: "rect",
      x: baseX, y: Math.round(h * 0.22), width: 10, height: 10,
      fill: payload.color, stroke: "rgba(255,255,255,0.2)", strokeWidth: 1,
      opacity: 1,
    },
    "quick-handle": {
      type: "text",
      x: baseX + 18, y: Math.round(h * 0.3) - Math.round(h * 0.16),
      width: "auto", height: Math.round(h * 0.16) + 8,
      content: handle, fontFamily, fontSize: Math.round(h * 0.16), fontWeight: 600,
      color: ink, textAlign: "left", textAlignVertical: "top",
      textAutoResize: "WIDTH_AND_HEIGHT",
    },
  };

  if (tagline) {
    layers.push({
      id: "quick-tagline", name: "Tagline", type: "text",
      locked: false, visible: true, active: false, parentId: null,
    });
    elementProperties["quick-tagline"] = {
      type: "text",
      x: baseX, y: Math.round(h * 0.62) - Math.round(h * 0.085),
      width: "auto", height: Math.round(h * 0.085) + 8,
      content: tagline, fontFamily, fontSize: Math.round(h * 0.085), fontWeight: 400,
      color: inkSoft, textAlign: "left", textAlignVertical: "top",
      textAutoResize: "WIDTH_AND_HEIGHT",
    };
  }

  return { frameSize: { width: w, height: h }, layers, elementProperties, name: handle };
}
