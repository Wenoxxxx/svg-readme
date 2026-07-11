import type { ReactElement } from "react";
import { createElement } from "react";
import type { FieldSchema, TemplateMeta } from "./schema";
import type { Renderable } from "../render/render";
import { whiteBackground } from "../render/animations";
import { ACCENT_PRESETS } from "./banner";

export interface StatCardProps {
  value: string;
  label: string;
  icon: string;
  primary: string;
  background: string;
  valueColor: string;
  labelColor: string;
}

function StatCard({
  value,
  label,
  icon,
  primary,
  background,
  valueColor,
  labelColor,
}: StatCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "400px",
        height: "200px",
        background,
        borderRadius: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* accent strip along the top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: primary,
        }}
      />
      <span style={{ fontSize: 44, lineHeight: 1, marginBottom: 4 }}>{icon}</span>
      <span
        style={{
          fontFamily: "Poppins",
          fontWeight: 500,
          fontSize: 64,
          color: valueColor,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 18,
          color: labelColor,
          marginTop: 10,
          letterSpacing: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export const statCardMeta: TemplateMeta = {
  type: "stat-card",
  name: "Stat card",
  description: "Big number + label — stars, commits, repos, etc.",
};

export const statCardDefaults: StatCardProps = {
  value: "1.2k",
  label: "TOTAL STARS",
  icon: "★",
  primary: "#1b5def",
  background: "#0f1117",
  valueColor: "#ffffff",
  labelColor: "#9CA3AF",
};

export const statCardFields: FieldSchema[] = [
  { key: "value", label: "Value", type: "text", group: "Content", placeholder: "1.2k" },
  { key: "label", label: "Label", type: "text", group: "Content", placeholder: "TOTAL STARS" },
  { key: "icon", label: "Icon (emoji)", type: "text", group: "Content", placeholder: "★" },
  { key: "primary", label: "Accent", type: "color", group: "Colors", presets: ACCENT_PRESETS },
  { key: "background", label: "Background", type: "color", group: "Colors" },
  { key: "valueColor", label: "Value color", type: "color", group: "Colors" },
  { key: "labelColor", label: "Label color", type: "color", group: "Colors" },
];

export const statCardRenderable: Renderable<StatCardProps> = {
  width: 400,
  height: 200,
  render: (props: StatCardProps): ReactElement => createElement(StatCard, props),
  inject: () =>
    `<style>
      text:nth-of-type(1) { animation: fadeUp 0.8s ease-out 0.1s both; }
      text:nth-of-type(2) { animation: fadeUp 0.8s ease-out 0.25s both; }
      text:nth-of-type(3) { animation: fadeUp 0.8s ease-out 0.4s both; }
      rect[height="6"] { animation: growBar 1s ease-in-out both; }
    </style>`,
};
