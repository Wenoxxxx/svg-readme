import type { LayerType } from "../../context/EditorContext";
import type { ElementProperties, ShapeElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import { groupLayer, shapeLayer, shapeProps, basePanel, pace, shade, withAlpha } from "./templatePrimitives";

// ─── Background animation templates ───────────────────────────────────────────
// Each template builds an (unlocked) background group sized to the frame. Only
// transform/opacity keyframes are used so canvas preview, SVG export, and
// animated GIF/PNG export all stay in sync (see lib/export/buildSvg.ts).
// Group ids carry the `bg-` prefix so replace flows can find them.
// Groups stay unlocked so every part remains editable after insert; build()
// accepts { primary, accent, speed } to customize colors + pacing.

export const BACKGROUND_GROUP_ID_PREFIX = "bg-";

export interface BackgroundTemplateOptions {
  /** Main hue — gradient mids, blob fills, far-layer tone. */
  primary?: string;
  /** Accent hue — washes, sweep band, near-layer dots, accent lines. */
  accent?: string;
  /** Speed multiplier applied to all durations (1 = default). */
  speed?: number;
}

export interface BackgroundTemplateBuild {
  layers: LayerType[];
  elementProperties: Record<string, ElementProperties>;
}

export interface BackgroundTemplate {
  id: string;
  name: string;
  desc: string;
  previewColors: string[];
  build: (w: number, h: number, opts?: BackgroundTemplateOptions) => BackgroundTemplateBuild;
}

export function isBackgroundGroup(layer: LayerType): boolean {
  return layer.type === "group" && layer.id.startsWith(BACKGROUND_GROUP_ID_PREFIX);
}

// ─── 1. Gradient drift ────────────────────────────────────────────────────────
// Static gradient base + translucent overlay pulsing opacity to fake drift.
// Overlay covers full frame so no edges show during the loop.

const gradientDrift: BackgroundTemplate = {
  id: "bg-gradient-drift",
  name: "Gradient Drift",
  desc: "Slow breathing gradient wash",
  previewColors: ["#6366f1", "#a855f7", "#ec4899"],
  build: (w, h, opts) => {
    const groupId = `bg-gradient-drift-${Date.now()}`;
    const baseId = `${groupId}-base`;
    const washId = `${groupId}-wash`;
    const primary = opts?.primary ?? "#6d28d9";
    const accent = opts?.accent ?? "#ec4899";
    const speed = opts?.speed ?? 1;
    // No opts → exact legacy stops; opts → derived palette.
    const baseStops = opts
      ? [
          { offset: 0, color: shade(primary, 16) },
          { offset: 0.5, color: primary },
          { offset: 1, color: shade(accent, 30) },
        ]
      : [
          { offset: 0, color: "#312e81" },
          { offset: 0.5, color: "#6d28d9" },
          { offset: 1, color: "#0e7490" },
        ];
    const washStops = opts
      ? [
          { offset: 0, color: accent },
          { offset: 1, color: primary },
        ]
      : [
          { offset: 0, color: "#ec4899" },
          { offset: 1, color: "#3b82f6" },
        ];
    const base = basePanel(groupId, w, h);
    return {
      layers: [
        groupLayer(groupId, "Background (Gradient Drift)"),
        base.layer,
        shapeLayer(baseId, "Gradient Base", groupId),
        shapeLayer(washId, "Drift Wash", groupId),
      ],
      elementProperties: {
        [base.layer.id]: base.props,
        [baseId]: shapeProps({
          kind: "rect",
          x: 0,
          y: 0,
          width: w,
          height: h,
          fill: {
            type: "linear",
            angle: 135,
            stops: baseStops,
          },
          stroke: "rgba(255,255,255,0)",
          strokeWidth: 0,
          opacity: 1,
        }),
        [washId]: shapeProps({
          kind: "rect",
          x: 0,
          y: 0,
          width: w,
          height: h,
          fill: {
            type: "linear",
            angle: 45,
            stops: washStops,
          },
          stroke: "rgba(255,255,255,0)",
          strokeWidth: 0,
          opacity: 0.35,
          animation: {
            name: "bgGradientDrift",
            duration: pace(8, speed),
            delay: 0,
            iterationCount: "infinite",
            timingFunction: "ease-in-out",
            direction: "alternate",
            fillMode: "none",
            customKeyframes: `@keyframes bgGradientDrift {
  from { opacity: 0.15; }
  to   { opacity: 0.55; }
}`,
          },
        }),
      },
    };
  },
};

// ─── 2. Floating blobs ────────────────────────────────────────────────────────
// Two/three soft radial blobs drifting on alternate loops with staggered delays.

const floatingBlobs: BackgroundTemplate = {
  id: "bg-floating-blobs",
  name: "Floating Blobs",
  desc: "Soft drifting gradient orbs",
  previewColors: ["#22d3ee", "#a78bfa", "#f0abfc"],
  build: (w, h, opts) => {
    const groupId = `bg-floating-blobs-${Date.now()}`;
    const blobA = `${groupId}-a`;
    const blobB = `${groupId}-b`;
    const blobC = `${groupId}-c`;
    const primary = opts?.primary ?? "#7c3aed";
    const accent = opts?.accent ?? "#22d3ee";
    const speed = opts?.speed ?? 1;
    const blobColors: Array<[string, string]> = opts
      ? [
          [shade(accent, 72), withAlpha(accent, 0)],
          [shade(primary, 72), withAlpha(primary, 0)],
          [shade(primary, 82), withAlpha(primary, 0)],
        ]
      : [
          ["#67e8f9", "#3b82f600"],
          ["#c4b5fd", "#7c3aed00"],
          ["#f0abfc", "#db277700"],
        ];
    const size = Math.round(Math.min(w * 0.45, h * 2.2));
    const base = basePanel(groupId, w, h);
    const keyframes = `@keyframes bgBlobFloat {
  from { opacity: 0.55; transform: translate(0, 0) scale(1); }
  to   { opacity: 0.9; transform: translate(24px, -14px) scale(1.08); }
}`;
    const blob = (
      x: number,
      y: number,
      s: number,
      colors: [string, string],
      delay: number,
      duration: number,
    ): ShapeElementProperties =>
      shapeProps({
        kind: "circle",
        x,
        y,
        width: s,
        height: s,
        fill: {
          type: "radial",
          cx: 0.5,
          cy: 0.5,
          stops: [
            { offset: 0, color: colors[0] },
            { offset: 1, color: colors[1] },
          ],
        },
        stroke: "rgba(255,255,255,0)",
        strokeWidth: 0,
        opacity: 0.7,
        animation: {
          name: "bgBlobFloat",
          duration,
          delay,
          iterationCount: "infinite",
          timingFunction: "ease-in-out",
          direction: "alternate",
          fillMode: "none",
          customKeyframes: keyframes,
        },
      });
    return {
      layers: [
        groupLayer(groupId, "Background (Floating Blobs)"),
        base.layer,
        shapeLayer(blobA, "Blob A", groupId),
        shapeLayer(blobB, "Blob B", groupId),
        shapeLayer(blobC, "Blob C", groupId),
      ],
      elementProperties: {
        [base.layer.id]: base.props,
        [blobA]: blob(Math.round(w * 0.06), Math.round(-h * 0.35), size, blobColors[0]!, 0, pace(7, speed)),
        [blobB]: blob(Math.round(w * 0.45), Math.round(-h * 0.2), Math.round(size * 0.8), blobColors[1]!, pace(1.2, speed), pace(9, speed)),
        [blobC]: blob(Math.round(w * 0.7), Math.round(h * 0.1), Math.round(size * 0.6), blobColors[2]!, pace(2.4, speed), pace(8, speed)),
      },
    };
  },
};

// ─── 3. Wave sweep ────────────────────────────────────────────────────────────
// Translucent band sweeping across the frame on a linear infinite loop.

const waveSweep: BackgroundTemplate = {
  id: "bg-wave-sweep",
  name: "Wave Sweep",
  desc: "Light band gliding across",
  previewColors: ["#09090b", "#3b82f6"],
  build: (w, h, opts) => {
    const groupId = `bg-wave-sweep-${Date.now()}`;
    const bandId = `${groupId}-band`;
    const bandW = Math.max(80, Math.round(w * 0.18));
    const base = basePanel(groupId, w, h);
    return {
      layers: [
        groupLayer(groupId, "Background (Wave Sweep)"),
        base.layer,
        shapeLayer(bandId, "Sweep Band", groupId),
      ],
      elementProperties: {
        [base.layer.id]: base.props,
        [bandId]: shapeProps({
          kind: "rect",
          x: 0,
          y: 0,
          width: bandW,
          height: h,
          fill: opts?.accent ?? "#3b82f6",
          stroke: "rgba(255,255,255,0)",
          strokeWidth: 0,
          cornerRadius: 0,
          opacity: 0.12,
          animation: {
            name: "bgWaveSweep",
            duration: pace(2.6, opts?.speed),
            delay: 0,
            iterationCount: "infinite",
            timingFunction: "ease-in-out",
            direction: "normal",
            fillMode: "none",
            customKeyframes: `@keyframes bgWaveSweep {
  0%   { opacity: 0; transform: translateX(${-bandW}px); }
  15%  { opacity: 0.12; }
  85%  { opacity: 0.12; }
  100% { opacity: 0; transform: translateX(${w}px); }
}`,
          },
        }),
      },
    };
  },
};

// ─── 4. Dot grid pulse ────────────────────────────────────────────────────────
// Grid of dots sharing one pulse keyframe with staggered delays. Capped at
// 24 dots to keep canvas perf + exported file size sane.

const dotGridPulse: BackgroundTemplate = {
  id: "bg-dot-grid-pulse",
  name: "Dot Grid Pulse",
  desc: "Twinkling dot matrix",
  previewColors: ["#09090b", "#a1a1aa"],
  build: (w, h, opts) => {
    const groupId = `bg-dot-grid-pulse-${Date.now()}`;
    const keyframes = `@keyframes bgDotPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.25; }
}`;
    const cols = Math.max(4, Math.min(8, Math.round(w / 100)));
    const rows = Math.max(2, Math.min(3, Math.round(h / 70)));
    const layers: LayerType[] = [groupLayer(groupId, "Background (Dot Grid)")];
    const elementProperties: Record<string, ElementProperties> = {};
    const dotR = 3;
    const dotFill = opts?.accent ?? "#a1a1aa";
    const speed = opts?.speed ?? 1;
    const base = basePanel(groupId, w, h);
    layers.push(base.layer);
    elementProperties[base.layer.id] = base.props;
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (i >= 23) break;
        const id = `${groupId}-dot-${i}`;
        layers.push(shapeLayer(id, `Dot ${i + 1}`, groupId));
        elementProperties[id] = shapeProps({
          kind: "circle",
          x: Math.round(24 + c * ((w - 48) / Math.max(cols - 1, 1)) - dotR),
          y: Math.round(24 + r * ((h - 48) / Math.max(rows - 1, 1)) - dotR),
          width: dotR * 2,
          height: dotR * 2,
          fill: dotFill,
          stroke: "rgba(255,255,255,0)",
          strokeWidth: 0,
          opacity: 0.8,
          animation: {
            name: "bgDotPulse",
            duration: pace(1.6, speed),
            delay: pace(i * 0.12, speed),
            iterationCount: "infinite",
            timingFunction: "ease-in-out",
            direction: "normal",
            fillMode: "none",
            customKeyframes: keyframes,
          },
        });
        i++;
      }
    }
    return { layers, elementProperties };
  },
};

// ─── 5. Grid parallax ─────────────────────────────────────────────────────────
// Two dot-grid layers drifting in opposite directions at different speeds to
// fake depth. Translate-only loops (no edges exposed), capped like dot pulse.

const gridParallax: BackgroundTemplate = {
  id: "bg-grid-parallax",
  name: "Grid Parallax",
  desc: "Dual-depth drifting grid",
  previewColors: ["#09090b", "#a1a1aa", "#3b82f6"],
  build: (w, h, opts) => {
    const groupId = `bg-grid-parallax-${Date.now()}`;
    const farKeyframes = `@keyframes bgGridFar {
  from { transform: translateX(-14px); }
  to   { transform: translateX(14px); }
}`;
    const nearKeyframes = `@keyframes bgGridNear {
  from { transform: translateX(14px); }
  to   { transform: translateX(-14px); }
}`;
    const layers: LayerType[] = [groupLayer(groupId, "Background (Grid Parallax)")];
    const elementProperties: Record<string, ElementProperties> = {};
    const speed = opts?.speed ?? 1;
    const farFill = opts?.primary ? shade(opts.primary, 35) : "#52525b";
    const nearFill = opts?.accent ?? "#a1a1aa";
    const nearAccent = opts?.accent ?? "#3b82f6";
    const base = basePanel(groupId, w, h);
    layers.push(base.layer);
    elementProperties[base.layer.id] = base.props;
    const cols = Math.max(4, Math.min(8, Math.round(w / 100)));
    const rows = Math.max(2, Math.min(3, Math.round(h / 70)));
    const cellX = (w - 48) / Math.max(cols - 1, 1);
    const cellY = (h - 48) / Math.max(rows - 1, 1);
    const farR = 2;
    const nearR = 3.5;
    let i = 0;
    let n = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (i + n >= 23) break;
        // Far layer: every cell, offset half-cell to interleave with near.
        const farId = `${groupId}-far-${i}`;
        layers.push(shapeLayer(farId, `Far Dot ${i + 1}`, groupId));
        elementProperties[farId] = shapeProps({
          kind: "circle",
          x: Math.round(24 + c * cellX + cellX / 2 - farR),
          y: Math.round(24 + r * cellY - farR),
          width: farR * 2,
          height: farR * 2,
          fill: farFill,
          stroke: "rgba(255,255,255,0)",
          strokeWidth: 0,
          opacity: 0.5,
          animation: {
            name: "bgGridFar",
            duration: pace(12, speed),
            delay: pace(i * 0.15, speed),
            iterationCount: "infinite",
            timingFunction: "ease-in-out",
            direction: "alternate",
            fillMode: "none",
            customKeyframes: farKeyframes,
          },
        });
        i++;
        // Near layer: sparser (every other cell), brighter, faster.
        if ((r + c) % 2 === 0 && i + n < 23) {
          const nearId = `${groupId}-near-${n}`;
          layers.push(shapeLayer(nearId, `Near Dot ${n + 1}`, groupId));
          elementProperties[nearId] = shapeProps({
            kind: "circle",
            x: Math.round(24 + c * cellX - nearR),
            y: Math.round(24 + r * cellY + cellY / 2 - nearR),
          width: nearR * 2,
          height: nearR * 2,
          fill: c === 0 ? nearAccent : nearFill,
            stroke: "rgba(255,255,255,0)",
            strokeWidth: 0,
            opacity: 0.85,
          animation: {
            name: "bgGridNear",
            duration: pace(7, speed),
            delay: pace(n * 0.15, speed),
              iterationCount: "infinite",
              timingFunction: "ease-in-out",
              direction: "alternate",
              fillMode: "none",
              customKeyframes: nearKeyframes,
            },
          });
          n++;
        }
      }
    }
    return { layers, elementProperties };
  },
};

// ─── 6. Grid lines parallax ───────────────────────────────────────────────────
// Full grid lines on a slow far layer drifting down plus brighter horizontals
// on a fast near layer drifting up. Thin rects stand in for lines so export +
// canvas render identically. Translate-only loops.

const gridLinesParallax: BackgroundTemplate = {
  id: "bg-grid-lines-parallax",
  name: "Grid Lines Parallax",
  desc: "Blueprint grid sinking down",
  previewColors: ["#09090b", "#3f3f46", "#3b82f6"],
  build: (w, h, opts) => {
    const groupId = `bg-grid-lines-parallax-${Date.now()}`;
    const farKeyframes = `@keyframes bgGridLinesFar {
  from { transform: translateY(-18px); }
  to   { transform: translateY(18px); }
}`;
    const nearKeyframes = `@keyframes bgGridLinesNear {
  from { transform: translateY(18px); }
  to   { transform: translateY(-18px); }
}`;
    const layers: LayerType[] = [groupLayer(groupId, "Background (Grid Lines Parallax)")];
    const elementProperties: Record<string, ElementProperties> = {};
    const speed = opts?.speed ?? 1;
    const farColor = opts?.primary ? shade(opts.primary, 18) : "#27272a";
    const nearColor = opts?.primary ? shade(opts.primary, 28) : "#3f3f46";
    const accentColor = opts?.accent ?? "#3b82f6";
    const base = basePanel(groupId, w, h);
    layers.push(base.layer);
    elementProperties[base.layer.id] = base.props;
    const vSpacing = 110;
    const hSpacing = 55;
    let count = 0;
    const pushLine = (
      id: string,
      name: string,
      kind: "v" | "h",
      pos: number,
      thickness: number,
      color: string,
      opacity: number,
      animName: "bgGridLinesFar" | "bgGridLinesNear",
      duration: number,
      keyframes: string,
    ) => {
      if (count >= 23) return;
      layers.push(shapeLayer(id, name, groupId));
      elementProperties[id] =
        kind === "v"
          ? shapeProps({
              kind: "rect",
              x: Math.round(pos),
              y: 0,
              width: thickness,
              height: h,
              fill: color,
              stroke: "rgba(255,255,255,0)",
              strokeWidth: 0,
              cornerRadius: 0,
              opacity,
              animation: {
                name: animName,
                duration,
                delay: 0,
                iterationCount: "infinite",
                timingFunction: "ease-in-out",
                direction: "alternate",
                fillMode: "none",
                customKeyframes: keyframes,
              },
            })
          : shapeProps({
              kind: "rect",
              x: 0,
              y: Math.round(pos),
              width: w,
              height: thickness,
              fill: color,
              stroke: "rgba(255,255,255,0)",
              strokeWidth: 0,
              cornerRadius: 0,
              opacity,
              animation: {
                name: animName,
                duration,
                delay: 0,
                iterationCount: "infinite",
                timingFunction: "ease-in-out",
                direction: "alternate",
                fillMode: "none",
                customKeyframes: keyframes,
              },
            });
      count++;
    };
    // Far layer: full grid, thin + dim, slow.
    let fi = 0;
    for (let x = vSpacing / 2; x < w; x += vSpacing) {
      pushLine(`${groupId}-far-v-${fi}`, `Far V-Line ${fi + 1}`, "v", x, 1, farColor, 0.9, "bgGridLinesFar", pace(14, speed), farKeyframes);
      fi++;
    }
    let fh = 0;
    // Ranged past the frame edges so the ±18px vertical drift never exposes gaps.
    for (let y = -18; y < h + 18; y += hSpacing) {
      pushLine(`${groupId}-far-h-${fh}`, `Far H-Line ${fh + 1}`, "h", y, 1, farColor, 0.9, "bgGridLinesFar", pace(14, speed), farKeyframes);
      fh++;
    }
    // Near layer: horizontals only, offset half-spacing, brighter + faster.
    // (Verticals would slide along their own axis — invisible — so near keeps
    // horizontals where the vertical drift actually reads.)
    let ni = 0;
    for (let y = hSpacing; y < h + hSpacing; y += hSpacing) {
      pushLine(
        `${groupId}-near-h-${ni}`,
        `Near H-Line ${ni + 1}`,
        "h",
        y,
        2,
        ni === 0 ? accentColor : nearColor,
        ni === 0 ? 0.5 : 0.9,
        "bgGridLinesNear",
        pace(8, speed),
        nearKeyframes,
      );
      ni++;
    }
    return { layers, elementProperties };
  },
};

export const BACKGROUND_TEMPLATES: BackgroundTemplate[] = [
  gradientDrift,
  floatingBlobs,
  waveSweep,
  dotGridPulse,
  gridParallax,
  gridLinesParallax,
];

export function getBackgroundTemplate(id: string): BackgroundTemplate | undefined {
  return BACKGROUND_TEMPLATES.find((t) => t.id === id);
}
