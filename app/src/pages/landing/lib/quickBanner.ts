export type QuickMotion = "fade" | "sweep" | "rise" | "type";
export type QuickTheme = "light" | "dark";
export type QuickFont = "mono" | "sans" | "display";

export interface QuickBannerOptions {
  handle: string;
  tagline: string;
  color: string;
  motion: QuickMotion;
  size: string;
  theme: QuickTheme;
  font?: QuickFont;
  gradient?: boolean;
}

export const QUICK_SWATCHES = [
  { name: "Blue", value: "#1b5def" },
  { name: "Ink", value: "#18181b" },
  { name: "Emerald", value: "#059669" },
  { name: "Rose", value: "#e11d48" },
  { name: "Amber", value: "#d97706" },
  { name: "Violet", value: "#7c3aed" },
] as const;

export const QUICK_FONTS: { id: QuickFont; name: string; stack: string }[] = [
  { id: "mono", name: "Mono", stack: "'JetBrains Mono',ui-monospace,monospace" },
  { id: "sans", name: "Sans", stack: "Inter,system-ui,sans-serif" },
  { id: "display", name: "Display", stack: "Poppins,sans-serif" },
];

export const QUICK_MOTIONS: { id: QuickMotion; name: string }[] = [
  { id: "fade", name: "Fade cascade" },
  { id: "sweep", name: "Gradient sweep" },
  { id: "rise", name: "Rise" },
  { id: "type", name: "Typewriter" },
];

export function escapeQuickXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseQuickSize(size: string): { w: number; h: number } {
  const [w, h] = size.split("x").map(Number);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return { w: 800, h: 200 };
  const cw = Math.round(w);
  const ch = Math.round(h);
  if (cw < 1 || ch < 1 || cw > 10000 || ch > 10000) return { w: 800, h: 200 };
  return { w: cw, h: ch };
}

export function quickUid(parts: string[]): string {
  const hash = parts
    .join("-")
    .split("")
    .reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0)
    .toString(36)
    .replace(/-/g, "x")
    .slice(0, 6);
  return `sr${hash}`;
}

export function fontStack(font: QuickFont | undefined): string {
  return QUICK_FONTS.find((f) => f.id === font)?.stack ?? QUICK_FONTS[0].stack;
}

export function buildQuickBanner({
  handle,
  tagline,
  color,
  motion,
  size,
  theme,
  font = "mono",
  gradient = false,
}: QuickBannerOptions): string {
  const { w, h } = parseQuickSize(size);
  const uid = quickUid([handle, tagline, color, motion, size, theme, font, String(gradient)]);
  const esc = escapeQuickXml;
  const dark = theme === "dark";
  const bg = dark ? "#09090b" : "#ffffff";
  const ink = dark ? "#fafafa" : "#18181b";
  const inkSoft = dark ? "#a1a1aa" : "#52525b";
  const border = dark ? "#27272a" : "#e4e4e7";
  const stack = fontStack(font);
  const safeHandle = handle.trim() || "Your Name";
  const words = tagline.split(" ").filter(Boolean);

  const baseX = (w * 0.065).toFixed(1);
  const handleY = (h * 0.3).toFixed(1);
  const tagY = (h * 0.62).toFixed(1);
  const handleSize = Math.round(h * 0.16);
  const tagSize = Math.round(h * 0.085);

  let motionCSS: string;
  let motionMarkup: string;
  let extraDefs = "";
  let extraOverlay = "";

  if (gradient) {
    extraDefs = `<linearGradient id="${uid}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.22"/><stop offset="0.55" stop-color="${color}" stop-opacity="0.06"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`;
    extraOverlay = `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="url(#${uid}-bg)"/>`;
  }

  if (motion === "fade" || motion === "rise") {
    const isRise = motion === "rise";
    motionCSS =
      words
        .map(
          (_, i) => `
        .${uid}-w${i}{opacity:0;animation:${uid}in .5s ease forwards;animation-delay:${0.25 + i * 0.09}s;}`,
        )
        .join("") +
      `
        @keyframes ${uid}in{from{opacity:0;${isRise ? "transform:translateY(8px);" : ""}}to{opacity:1;transform:none;}}
        .${uid}-handle{opacity:0;animation:${uid}in .5s ease forwards;animation-delay:0.05s;}
        .${uid}-dot{animation:${uid}pulse 1.6s ease-in-out infinite;}
        @keyframes ${uid}pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
      `;
    motionMarkup = words
      .map((word, i) =>
        i === 0
          ? `<tspan class="${uid}-w${i}" x="${baseX}" y="${tagY}">${esc(word)}</tspan>`
          : `<tspan class="${uid}-w${i}" dx="8">${esc(word)}</tspan>`,
      )
      .join("");
  } else if (motion === "type") {
    const chars = tagline.length;
    const dur = Math.min(2.4, Math.max(0.8, chars * 0.045));
    motionCSS = `
        .${uid}-handle{opacity:0;animation:${uid}fadeIn .6s ease forwards .1s;}
        @keyframes ${uid}fadeIn{to{opacity:1;}}
        .${uid}-type{overflow:hidden;white-space:nowrap;animation:${uid}typing ${dur.toFixed(2)}s steps(${Math.max(chars, 1)},end) .3s both;}
        @keyframes ${uid}typing{from{opacity:0;}to{opacity:1;}}
        .${uid}-caret{animation:${uid}blink 1s steps(1) infinite;}
        @keyframes ${uid}blink{0%,55%{opacity:1;}56%,100%{opacity:0;}}
        .${uid}-dot{animation:${uid}pulse 1.6s ease-in-out infinite;}
        @keyframes ${uid}pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
      `;
    motionMarkup =
      words.length === 0
        ? ""
        : `<tspan class="${uid}-type" x="${baseX}" y="${tagY}">${esc(tagline)}</tspan><tspan class="${uid}-caret}" dx="4">▍</tspan>`;
  } else {
    motionCSS = `
        .${uid}-handle{opacity:0;animation:${uid}fadeIn .6s ease forwards .1s;}
        .${uid}-tag{opacity:0;animation:${uid}fadeIn .6s ease forwards .3s;}
        @keyframes ${uid}fadeIn{to{opacity:1;}}
        .${uid}-sweep{animation:${uid}sweep 2.6s ease-in-out infinite;}
        @keyframes ${uid}sweep{
          0%{transform:translateX(-30%);}
          50%{transform:translateX(${w}px);}
          100%{transform:translateX(${w}px);}
        }
        .${uid}-dot{animation:${uid}pulse 1.6s ease-in-out infinite;}
        @keyframes ${uid}pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
      `;
    motionMarkup =
      words.length === 0
        ? ""
        : `<tspan class="${uid}-tag" x="${baseX}" y="${tagY}">${esc(tagline)}</tspan>`;
    extraOverlay += `<rect class="${uid}-sweep" x="0" y="0" width="${(w * 0.18).toFixed(0)}" height="${h}" fill="${color}" opacity="0.10"/>`;
  }

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(safeHandle)} banner">
  <style>text{font-family:${stack};}${motionCSS}</style>
  <defs>${extraDefs}</defs>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="${bg}" stroke="${border}" rx="4"/>
  ${extraOverlay}
  <rect x="${baseX}" y="${(h * 0.22).toFixed(1)}" width="10" height="10" fill="${color}" class="${uid}-dot" rx="2"/>
  <text class="${uid}-handle" x="${(w * 0.065 + 18).toFixed(1)}" y="${handleY}" font-size="${handleSize}" font-weight="600" fill="${ink}">${esc(safeHandle)}</text>
  <text font-size="${tagSize}" fill="${inkSoft}">${motionMarkup}</text>
</svg>`;
}
