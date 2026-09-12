import type { LayerType } from "../../context/EditorContext";
import type { ElementProperties } from "../../components/editor-canvas/ElementsRenderer";
import {
  groupLayer,
  shapeLayer,
  shapeProps,
  textLayer,
  textProps,
  templateInstanceId,
  type TemplateBuild,
} from "./templatePrimitives";

// ─── Full animated banner kits ────────────────────────────────────────────────
// Composite groups (bg + text + accents) inserted on top of the canvas. Groups
// stay unlocked so users edit text inline or add more elements inside. Only
// transform/opacity keyframes — export-safe like background templates.

export interface AnimatedComponent {
  id: string;
  name: string;
  desc: string;
  previewColors: string[];
  build: (w: number, h: number) => TemplateBuild & { selectId: string };
}

const fadeUp = (name: string, delay: number) => ({
  name,
  duration: 0.6,
  delay,
  iterationCount: 1 as const,
  timingFunction: "ease-out",
  direction: "normal" as const,
  fillMode: "forwards" as const,
  customKeyframes: `@keyframes ${name} {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}`,
});

// ─── Kit 1: Profile hero ─────────────────────────────────────────────────────

const profileHero: AnimatedComponent = {
  id: "kit-profile-hero",
  name: "Profile Hero",
  desc: "Name + tagline over gradient",
  previewColors: ["#6d28d9", "#fafafa", "#22d3ee"],
  build: (w, h) => {
    const g = templateInstanceId("kit-profile-hero");
    const baseX = Math.round(w * 0.065);
    const layers: LayerType[] = [
      groupLayer(g, "Profile Hero"),
      shapeLayer(`${g}-panel`, "Hero Panel", g),
      shapeLayer(`${g}-dot`, "Accent Dot", g),
      textLayer(`${g}-handle`, "Handle", g),
      textLayer(`${g}-tagline`, "Tagline", g),
    ];
    const handleSize = Math.max(18, Math.round(h * 0.16));
    const tagSize = Math.max(11, Math.round(h * 0.085));
    const elementProperties: Record<string, ElementProperties> = {
      [`${g}-panel`]: shapeProps({
        kind: "rect",
        x: Math.round(w * 0.03),
        y: Math.round(h * 0.08),
        width: Math.round(w * 0.94),
        height: Math.round(h * 0.84),
        fill: {
          type: "linear",
          angle: 135,
          stops: [
            { offset: 0, color: "#1e1b4b" },
            { offset: 0.55, color: "#4c1d95" },
            { offset: 1, color: "#0e7490" },
          ],
        },
        stroke: "rgba(255,255,255,0.12)",
        strokeWidth: 1,
        cornerRadius: 10,
        opacity: 1,
      }),
      [`${g}-dot`]: shapeProps({
        kind: "circle",
        x: baseX,
        y: Math.round(h * 0.22),
        width: 10,
        height: 10,
        fill: "#22d3ee",
        stroke: "rgba(255,255,255,0)",
        strokeWidth: 0,
        opacity: 1,
        animation: {
          name: "kitHeroPulse",
          duration: 1.6,
          delay: 0,
          iterationCount: "infinite",
          timingFunction: "ease-in-out",
          direction: "normal",
          fillMode: "none",
          customKeyframes: `@keyframes kitHeroPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}`,
        },
      }),
      [`${g}-handle`]: textProps({
        x: baseX + 18,
        y: Math.round(h * 0.24),
        width: "auto",
        height: handleSize + 8,
        content: "Your Name",
        fontFamily: "Poppins",
        fontSize: handleSize,
        fontWeight: 600,
        color: "#fafafa",
        textAlign: "left",
        textAlignVertical: "top",
        textAutoResize: "WIDTH_AND_HEIGHT",
        animation: fadeUp("kitHeroFade", 0.05),
      }),
      [`${g}-tagline`]: textProps({
        x: baseX,
        y: Math.round(h * 0.24) + handleSize + 10,
        width: "auto",
        height: tagSize + 8,
        content: "Ship something daily",
        fontFamily: "Inter",
        fontSize: tagSize,
        fontWeight: 400,
        color: "#d4d4d8",
        textAlign: "left",
        textAlignVertical: "top",
        textAutoResize: "WIDTH_AND_HEIGHT",
        animation: fadeUp("kitHeroFade", 0.25),
      }),
    };
    return { layers, elementProperties, selectId: g };
  },
};

// ─── Kit 2: Project showcase ─────────────────────────────────────────────────

const projectShowcase: AnimatedComponent = {
  id: "kit-project-showcase",
  name: "Project Showcase",
  desc: "Title + badges + sweep",
  previewColors: ["#09090b", "#3b82f6", "#a78bfa"],
  build: (w, h) => {
    const g = templateInstanceId("kit-project-showcase");
    const pad = Math.round(w * 0.04);
    const panelW = Math.round(w * 0.6);
    const panelH = Math.round(h * 0.84);
    const panelX = Math.round((w - panelW) / 2);
    const panelY = Math.round((h - panelH) / 2);
    const titleSize = Math.max(16, Math.round(h * 0.14));
    const badgeAnim = (delay: number) => ({
      name: "kitShowSlide",
      duration: 0.5,
      delay,
      iterationCount: 1 as const,
      timingFunction: "ease-out",
      direction: "normal" as const,
      fillMode: "forwards" as const,
      customKeyframes: `@keyframes kitShowSlide {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}`,
    });
    const layers: LayerType[] = [
      groupLayer(g, "Project Showcase"),
      shapeLayer(`${g}-panel`, "Showcase Panel", g),
      shapeLayer(`${g}-sweep`, "Sweep", g),
      textLayer(`${g}-title`, "Title", g),
      shapeLayer(`${g}-badge-0`, "Badge 1", g),
      shapeLayer(`${g}-badge-1`, "Badge 2", g),
      shapeLayer(`${g}-badge-2`, "Badge 3", g),
    ];
    const badgeColors = ["#3b82f6", "#a78bfa", "#22d3ee"];
    const badgeW = Math.min(120, Math.round(panelW * 0.22));
    const elementProperties: Record<string, ElementProperties> = {
      [`${g}-panel`]: shapeProps({
        kind: "rect",
        x: panelX,
        y: panelY,
        width: panelW,
        height: panelH,
        fill: "#09090b",
        stroke: "rgba(255,255,255,0.12)",
        strokeWidth: 1,
        cornerRadius: 10,
        opacity: 1,
      }),
      [`${g}-sweep`]: shapeProps({
        kind: "rect",
        x: panelX,
        y: panelY,
        width: Math.max(60, Math.round(panelW * 0.18)),
        height: panelH,
        fill: "#3b82f6",
        stroke: "rgba(255,255,255,0)",
        strokeWidth: 0,
        cornerRadius: 0,
        opacity: 0.1,
        animation: {
          name: "kitShowSweep",
          duration: 2.6,
          delay: 0.4,
          iterationCount: "infinite",
          timingFunction: "ease-in-out",
          direction: "normal",
          fillMode: "none",
          customKeyframes: `@keyframes kitShowSweep {
  0%   { opacity: 0; transform: translateX(-60px); }
  15%  { opacity: 0.1; }
  85%  { opacity: 0.1; }
  100% { opacity: 0; transform: translateX(${panelW}px); }
}`,
        },
      }),
      [`${g}-title`]: textProps({
        x: panelX + pad,
        y: panelY + Math.round(panelH * 0.14),
        width: "auto",
        height: titleSize + 8,
        content: "Featured Project",
        fontFamily: "Poppins",
        fontSize: titleSize,
        fontWeight: 600,
        color: "#fafafa",
        textAlign: "left",
        textAlignVertical: "top",
        textAutoResize: "WIDTH_AND_HEIGHT",
        animation: fadeUp("kitShowFade", 0.1),
      }),
    };
    badgeColors.forEach((c, i) => {
      elementProperties[`${g}-badge-${i}`] = shapeProps({
        kind: "rect",
        x: panelX + pad + i * (badgeW + 10),
        y: panelY + Math.round(panelH * 0.14) + titleSize + 16,
        width: badgeW,
        height: 22,
        fill: c,
        stroke: "rgba(255,255,255,0)",
        strokeWidth: 0,
        cornerRadius: 11,
        opacity: 0.9,
        animation: badgeAnim(0.3 + i * 0.12),
      });
    });
    return { layers, elementProperties, selectId: g };
  },
};

// ─── Kit 3: Stats strip ──────────────────────────────────────────────────────

const statsStrip: AnimatedComponent = {
  id: "kit-stats-strip",
  name: "Stats Strip",
  desc: "Three animated stat blocks",
  previewColors: ["#fafafa", "#a1a1aa", "#e11d48"],
  build: (w, h) => {
    const g = templateInstanceId("kit-stat-strip");
    const layers: LayerType[] = [groupLayer(g, "Stats Strip")];
    const elementProperties: Record<string, ElementProperties> = {};
    const stats: Array<[string, string]> = [
      ["12k", "stars"],
      ["48", "projects"],
      ["6y", "shipping"],
    ];
    const colW = w / 3;
    const valueSize = Math.max(18, Math.round(h * 0.22));
    const labelSize = Math.max(10, Math.round(h * 0.08));
    stats.forEach(([value, label], i) => {
      const cx = Math.round(colW * i + colW / 2);
      const vId = `${g}-value-${i}`;
      const lId = `${g}-label-${i}`;
      layers.push(textLayer(vId, `Stat Value ${i + 1}`, g));
      layers.push(textLayer(lId, `Stat Label ${i + 1}`, g));
      elementProperties[vId] = textProps({
        x: cx - 60,
        y: Math.round(h * 0.18),
        width: 120,
        height: valueSize + 8,
        content: value,
        fontFamily: "JetBrains Mono",
        fontSize: valueSize,
        fontWeight: 700,
        color: "#fafafa",
        textAlign: "center",
        textAlignVertical: "top",
        textAutoResize: "NONE",
        animation: fadeUp("kitStatFade", 0.1 + i * 0.15),
      });
      elementProperties[lId] = textProps({
        x: cx - 60,
        y: Math.round(h * 0.18) + valueSize + 10,
        width: 120,
        height: labelSize + 8,
        content: label,
        fontFamily: "Inter",
        fontSize: labelSize,
        fontWeight: 400,
        color: "#a1a1aa",
        textAlign: "center",
        textAlignVertical: "top",
        textAutoResize: "NONE",
        animation: fadeUp("kitStatFade", 0.2 + i * 0.15),
      });
      if (i > 0) {
        const dId = `${g}-divider-${i}`;
        layers.push(shapeLayer(dId, `Divider ${i}`, g));
        elementProperties[dId] = shapeProps({
          kind: "line",
          x: Math.round(colW * i),
          y: Math.round(h * 0.25),
          width: 1,
          height: Math.round(h * 0.5),
          fill: "#27272a",
          stroke: "#27272a",
          strokeWidth: 1,
          opacity: 1,
        });
      }
    });
    return { layers, elementProperties, selectId: g };
  },
};

export const ANIMATED_COMPONENTS: AnimatedComponent[] = [
  profileHero,
  projectShowcase,
  statsStrip,
];

export function getAnimatedComponent(id: string): AnimatedComponent | undefined {
  return ANIMATED_COMPONENTS.find((c) => c.id === id);
}
