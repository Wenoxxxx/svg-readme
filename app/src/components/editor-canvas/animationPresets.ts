// ─── Animation Types ──────────────────────────────────────────────────────────

/** Animation configuration for a layer, embedded in the exported SVG as CSS @keyframes. */
export interface AnimationConfig {
  /** CSS @keyframes identifier (e.g. "fadeIn", "slideUp", or a custom name). */
  name: string;
  /** Duration in seconds. */
  duration: number;
  /** Delay in seconds before the animation starts. */
  delay: number;
  /** Number of iterations or "infinite". */
  iterationCount: number | "infinite";
  /** CSS animation-timing-function. */
  timingFunction: string;
  /** CSS animation-direction. */
  direction: "normal" | "reverse" | "alternate" | "alternate-reverse";
  /** CSS animation-fill-mode. */
  fillMode: "none" | "forwards" | "backwards" | "both";
  /** Optional raw @keyframes CSS block. When provided, this is used in the export
   *  instead of looking up the preset by name. Lets users define fully custom animations. */
  customKeyframes?: string;
  /** Optional keyframe timeline markers for the visual timeline editor.
   *  Each entry maps to a percentage point (0-100) with an optional easing hint. */
  keyframes?: { percent: number; easing?: string; id?: string }[];
}

// ─── Animation Presets ────────────────────────────────────────────────────────

/** Pre-built animation presets — maps a display name to its @keyframes CSS and default config. */
export const ANIMATION_PRESETS: Record<
  string,
  { keyframesCSS: string; defaults: Partial<AnimationConfig> }
> = {
  "Fade In": {
    keyframesCSS: `@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}`,
    defaults: { name: "fadeIn", duration: 0.8, delay: 0, iterationCount: 1, timingFunction: "ease", direction: "normal", fillMode: "forwards" },
  },
  "Slide Up": {
    keyframesCSS: `@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}`,
    defaults: { name: "slideUp", duration: 0.6, delay: 0, iterationCount: 1, timingFunction: "ease-out", direction: "normal", fillMode: "forwards" },
  },
  "Pulse": {
    keyframesCSS: `@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}`,
    defaults: { name: "pulse", duration: 1.6, delay: 0, iterationCount: "infinite", timingFunction: "ease-in-out", direction: "normal", fillMode: "none" },
  },
  "Bounce": {
    keyframesCSS: `@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10px); }
}`,
    defaults: { name: "bounce", duration: 0.7, delay: 0, iterationCount: "infinite", timingFunction: "ease-in-out", direction: "normal", fillMode: "none" },
  },
  "Slide In Left": {
    keyframesCSS: `@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to   { opacity: 1; transform: translateX(0); }
}`,
    defaults: { name: "slideInLeft", duration: 0.6, delay: 0, iterationCount: 1, timingFunction: "ease-out", direction: "normal", fillMode: "forwards" },
  },
  "Slide In Right": {
    keyframesCSS: `@keyframes slideInRight {
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateX(0); }
}`,
    defaults: { name: "slideInRight", duration: 0.6, delay: 0, iterationCount: 1, timingFunction: "ease-out", direction: "normal", fillMode: "forwards" },
  },
  "Zoom In": {
    keyframesCSS: `@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}`,
    defaults: { name: "zoomIn", duration: 0.5, delay: 0, iterationCount: 1, timingFunction: "ease-out", direction: "normal", fillMode: "forwards" },
  },
  "Rotate": {
    keyframesCSS: `@keyframes rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}`,
    defaults: { name: "rotate", duration: 2, delay: 0, iterationCount: "infinite", timingFunction: "linear", direction: "normal", fillMode: "none" },
  },
};

/** Builds the CSS animation shorthand from an AnimationConfig. */
export function buildAnimationCSS(cfg: AnimationConfig, nameOverride?: string): string {
  return `${nameOverride ?? cfg.name} ${cfg.duration}s ${cfg.timingFunction} ${cfg.delay}s ${cfg.iterationCount} ${cfg.direction} ${cfg.fillMode}`;
}

// ─── Per-layer keyframes resolution ───────────────────────────────────────────────────

export interface KeyframeBlock {
  percent: number;
  body: string;
}

/** Parse the selector blocks of a single `@keyframes name { ... }` rule.
 *  Comma selector lists are expanded; `from`/`to` map to 0/100. */
export function parseKeyframesCSS(css: string): { name: string | null; blocks: KeyframeBlock[] } {
  const head = css.match(/@keyframes\s+([^\s{]+)\s*\{/);
  const name = head ? head[1] : null;
  const start = head ? (head.index ?? 0) + head[0].length : css.indexOf("{") + 1;
  const inner = css.slice(Math.max(0, start));
  const blocks: KeyframeBlock[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    const body = m[2].trim();
    for (const raw of m[1].split(",")) {
      const sel = raw.trim().toLowerCase();
      const percent = sel === "from" ? 0 : sel === "to" ? 100 : Number.parseFloat(sel);
      if (Number.isFinite(percent)) blocks.push({ percent, body });
    }
  }
  blocks.sort((a, b) => a.percent - b.percent);
  return { name, blocks };
}

/**
 * Retime keyframe blocks with timeline markers: marker i corresponds to the
 * original percent i/(n-1)·100, and every original stop is mapped through the
 * piecewise-linear remap. Holds the first/last state outside the marker range
 * and emits per-marker `animation-timing-function` hints.
 */
export function retimeKeyframeBlocks(
  blocks: KeyframeBlock[],
  markers: { percent: number; easing?: string }[],
): KeyframeBlock[] {
  if (blocks.length === 0 || markers.length < 2) return blocks;
  const sorted = [...markers].sort((a, b) => a.percent - b.percent);
  const n = sorted.length;
  const orig = sorted.map((_, i) => (i / (n - 1)) * 100);
  const remap = (p: number) => {
    for (let i = 0; i < n - 1; i++) {
      if (p <= orig[i + 1] || i === n - 2) {
        const span = orig[i + 1] - orig[i] || 1;
        const t = Math.max(0, Math.min(1, (p - orig[i]) / span));
        return sorted[i].percent + t * (sorted[i + 1].percent - sorted[i].percent);
      }
    }
    return p;
  };
  const byPercent = new Map<number, string>();
  const put = (percent: number, body: string) => {
    const key = Math.round(percent * 100) / 100;
    byPercent.set(key, byPercent.has(key) ? `${byPercent.get(key)} ${body}` : body);
  };
  for (const b of blocks) put(remap(b.percent), b.body);
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  if (sorted[0].percent > 0) put(0, first.body);
  if (sorted[n - 1].percent < 100) put(100, last.body);
  // Easing hints apply to the segment that starts at each marker.
  for (const mk of sorted) {
    if (!mk.easing) continue;
    const key = Math.round(mk.percent * 100) / 100;
    const body = byPercent.get(key) ?? bodyBefore(blocks, remap, key);
    byPercent.set(key, `${body} animation-timing-function: ${mk.easing};`.trim());
  }
  return [...byPercent.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([percent, body]) => ({ percent, body }));
}

/** Body of the closest preceding (remapped) block — used when an easing
 *  marker has no block of its own. */
function bodyBefore(blocks: KeyframeBlock[], remap: (p: number) => number, at: number): string {
  let best = blocks[0];
  for (const b of blocks) if (remap(b.percent) <= at) best = b;
  return best.body;
}

export function serializeKeyframes(name: string, blocks: KeyframeBlock[]): string {
  const lines = blocks.map((b) => `  ${Math.round(b.percent * 100) / 100}% { ${b.body} }`);
  return `@keyframes ${name} {\n${lines.join("\n")}\n}`;
}

/** CSS-safe per-layer animation name. */
export function layerAnimationName(layerId: string, base: string): string {
  return `${base}-${layerId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/**
 * Resolve the @keyframes CSS + animation name a layer should use.
 * - Plain preset: shared preset keyframes (deduped by name by the caller).
 * - Custom keyframes and/or timeline markers: a per-layer uniquely named
 *   @keyframes rule (keyed by layer id so layers never clobber each other),
 *   and the returned `name` is what the animation shorthand must reference.
 */
export function resolveLayerAnimation(
  layerId: string,
  anim: AnimationConfig,
): { name: string; keyframesCSS: string | null; shared: boolean; css: string } {
  const preset = Object.values(ANIMATION_PRESETS).find((p) => p.defaults.name === anim.name);
  const custom = anim.customKeyframes?.trim() ? anim.customKeyframes : null;
  const source = custom ?? preset?.keyframesCSS ?? null;
  const hasMarkers = !!anim.keyframes && anim.keyframes.length >= 2;
  if (!source) {
    return { name: anim.name, keyframesCSS: null, shared: true, css: buildAnimationCSS(anim) };
  }
  if (!custom && !hasMarkers) {
    return { name: anim.name, keyframesCSS: source, shared: true, css: buildAnimationCSS(anim) };
  }
  const parsed = parseKeyframesCSS(source);
  const name = layerAnimationName(layerId, parsed.name ?? anim.name);
  const blocks = hasMarkers ? retimeKeyframeBlocks(parsed.blocks, anim.keyframes!) : parsed.blocks;
  const keyframesCSS = blocks.length > 0
    ? serializeKeyframes(name, blocks)
    : source.replace(/@keyframes\s+[^\s{]+/, `@keyframes ${name}`);
  return { name, keyframesCSS, shared: false, css: buildAnimationCSS(anim, name) };
}
